import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';
import { cleanupBrokenImageUrls, checkForBrokenImages } from '@/utils/cleanupBrokenImages';

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeItems: number;
  draftItems: number;
}

interface InventoryState {
  listings: Listing[];
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;
  stats: InventoryStats;
  usingFallback: boolean;
  syncInProgress: Set<string>;
  filters: {
    search: string;
    category: string;
    status: string;
    platform: string;
  };
  
  // Actions
  setListings: (listings: Listing[]) => void;
  addListing: (listing: Listing) => void;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<boolean>;
  deleteListing: (id: string) => Promise<boolean>;
  duplicateListing: (listing: Listing) => Promise<Listing | null>;
  removeListing: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<InventoryState['filters']>) => void;
  clearFilters: () => void;
  fetchListings: () => Promise<void>;
  refetch: () => Promise<void>;
  syncListing: (id: string) => Promise<void>;
  setSyncInProgress: (id: string, inProgress: boolean) => void;
}

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      listings: [],
      selectedIds: [],
      isLoading: false,
      error: null,
      usingFallback: false,
      syncInProgress: new Set(),
      stats: {
        totalItems: 0,
        totalValue: 0,
        activeItems: 0,
        draftItems: 0
      },
      filters: {
        search: '',
        category: '',
        status: '',
        platform: '',
      },
      
      setListings: (listings) => {
        const stats = {
          totalItems: listings.length,
          totalValue: listings.reduce((sum, item) => sum + (item.price || 0), 0),
          activeItems: listings.filter(item => item.status === 'active').length,
          draftItems: listings.filter(item => item.status === 'draft').length
        };
        set({ listings, stats, error: null });
      },
      
      addListing: async (listing) => {
        try {
          // Get current user
          const { data: { session }, error: authError } = await supabase.auth.getSession();
          if (authError || !session?.user) {
            console.error('❌ No authenticated user for adding listing');
            return;
          }

          // Set user_id on the listing
          const listingWithUser = {
            ...listing,
            user_id: session.user.id
          };

          // Save to Supabase
          const { data, error } = await supabase
            .from('listings')
            .insert([listingWithUser])
            .select()
            .single();

          if (error) {
            console.error('❌ Failed to save listing to database:', error);
            throw error;
          }

          console.log('✅ Listing saved to database:', data);

          // Update local state with the saved listing
          set((state) => {
            const newListings = [...state.listings, data as Listing];
            const stats = {
              totalItems: newListings.length,
              totalValue: newListings.reduce((sum, item) => sum + (item.price || 0), 0),
              activeItems: newListings.filter(item => item.status === 'active').length,
              draftItems: newListings.filter(item => item.status === 'draft').length
            };
            return { listings: newListings, stats };
          });
        } catch (error) {
          console.error('❌ Error adding listing:', error);
          set({ error: 'Failed to save listing. Please try again.' });
        }
      },
      
      updateListing: async (id, updates) => {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            set({ error: 'Authentication required' });
            return false;
          }

          const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('listings')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select();

          if (error) {
            set({ error: error.message });
            return false;
          }

          if (!data || data.length === 0) {
            set({ error: 'Listing not found or permission denied' });
            return false;
          }

          // Update local state
          set((state) => {
            const newListings = state.listings.map(listing =>
              listing.id === id ? { ...listing, ...updates } : listing
            );
            const stats = {
              totalItems: newListings.length,
              totalValue: newListings.reduce((sum, item) => sum + (item.price || 0), 0),
              activeItems: newListings.filter(item => item.status === 'active').length,
              draftItems: newListings.filter(item => item.status === 'draft').length
            };
            return { listings: newListings, stats };
          });

          return true;
        } catch (error: any) {
          set({ error: error.message });
          return false;
        }
      },

      deleteListing: async (id) => {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            set({ error: 'Authentication required' });
            return false;
          }

          const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            set({ error: error.message });
            return false;
          }

          // Update local state
          set((state) => {
            const newListings = state.listings.filter(listing => listing.id !== id);
            const stats = {
              totalItems: newListings.length,
              totalValue: newListings.reduce((sum, item) => sum + (item.price || 0), 0),
              activeItems: newListings.filter(item => item.status === 'active').length,
              draftItems: newListings.filter(item => item.status === 'draft').length
            };
            return { 
              listings: newListings, 
              stats,
              selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
            };
          });

          return true;
        } catch (error: any) {
          set({ error: error.message });
          return false;
        }
      },

      duplicateListing: async (item) => {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            set({ error: 'Authentication required' });
            return null;
          }

          const { data, error } = await supabase
            .from('listings')
            .insert({
              title: `${item.title} (Copy)`,
              description: item.description,
              price: item.price,
              category: item.category,
              condition: item.condition,
              measurements: item.measurements,
              keywords: item.keywords,
              photos: item.photos,
              shipping_cost: item.shipping_cost,
              status: 'draft',
              user_id: user.id
            })
            .select()
            .single();

          if (error) {
            set({ error: error.message });
            return null;
          }

          const newListing = data as Listing;
          get().addListing(newListing);
          return newListing;
        } catch (error: any) {
          set({ error: error.message });
          return null;
        }
      },
      
      removeListing: (id) => set((state) => {
        const newListings = state.listings.filter(listing => listing.id !== id);
        const stats = {
          totalItems: newListings.length,
          totalValue: newListings.reduce((sum, item) => sum + (item.price || 0), 0),
          activeItems: newListings.filter(item => item.status === 'active').length,
          draftItems: newListings.filter(item => item.status === 'draft').length
        };
        return {
          listings: newListings,
          stats,
          selectedIds: state.selectedIds.filter(selectedId => selectedId !== id)
        };
      }),
      
      setSelectedIds: (selectedIds) => set({ selectedIds }),
      
      toggleSelected: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter(selectedId => selectedId !== id)
          : [...state.selectedIds, id]
      })),
      
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      clearFilters: () => set({
        filters: {
          search: '',
          category: '',
          status: '',
          platform: '',
        }
      }),

      fetchListings: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { session }, error: authError } = await supabase.auth.getSession();
          
          if (authError) {
            console.error('❌ Supabase auth error:', authError);
            throw new Error(`Authentication error: ${authError.message}`);
          }
          
          if (!session?.user) {
            console.log('⚠️ No active session found. User needs to sign in.');
            set({ 
              error: null, 
              isLoading: false, 
              listings: [],
              stats: {
                totalItems: 0,
                totalValue: 0,
                activeItems: 0,
                draftItems: 0
              }
            });
            return;
          }
          
          const user = session.user;
          
          // Clear any stale cached data first
          const cacheKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('inventory_') || key.startsWith('listings_')
          );
          cacheKeys.forEach(key => {
            try {
              const cached = JSON.parse(localStorage.getItem(key) || '{}');
              if (cached.timestamp && Date.now() - cached.timestamp > 300000) { // 5 minutes
                localStorage.removeItem(key);
              }
            } catch {
              localStorage.removeItem(key);
            }
          });

          console.log('🔄 Fetching fresh inventory data from Supabase cloud for user:', user.id);
          
          const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Supabase inventory fetch error:', error);
            throw error;
          }

          console.log(`✅ Loaded ${data?.length || 0} listings from Supabase cloud`);
          
          // Check for and clean up any broken blob URLs
          const brokenCheck = await checkForBrokenImages();
          if (brokenCheck.hasBrokenImages) {
            console.log(`🔧 Found ${brokenCheck.brokenCount} listings with broken images. Cleaning up...`);
            const cleanup = await cleanupBrokenImageUrls();
            if (cleanup.success && cleanup.fixed > 0) {
              console.log(`✅ Fixed ${cleanup.fixed} listings with broken images`);
              // Refetch the data after cleanup to get the updated listings
              const { data: updatedData, error: refetchError } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              
              if (!refetchError && updatedData) {
                get().setListings(updatedData as Listing[]);
              } else {
                get().setListings((data || []) as Listing[]);
              }
            } else {
              get().setListings((data || []) as Listing[]);
              if (cleanup.errors.length > 0) {
                console.warn('⚠️ Some listings could not be cleaned up:', cleanup.errors);
              }
            }
          } else {
            get().setListings((data || []) as Listing[]);
          }
          
          set({ usingFallback: false });
        } catch (error: any) {
          console.error('❌ Inventory fetch failed:', error);
          set({ error: error.message, usingFallback: true });
        } finally {
          set({ isLoading: false });
        }
      },

      refetch: async () => {
        await get().fetchListings();
      },

      syncListing: async (id: string) => {
        const { InventorySyncService } = await import('@/services/InventorySyncService');
        
        set(state => ({
          syncInProgress: new Set([...state.syncInProgress, id])
        }));

        try {
          await InventorySyncService.syncListingAcrossPlatforms(id);
        } catch (error) {
          console.error('Failed to sync listing:', error);
          throw error;
        } finally {
          set(state => {
            const newSet = new Set(state.syncInProgress);
            newSet.delete(id);
            return { syncInProgress: newSet };
          });
        }
      },

      setSyncInProgress: (id: string, inProgress: boolean) => {
        set(state => {
          const newSet = new Set(state.syncInProgress);
          if (inProgress) {
            newSet.add(id);
          } else {
            newSet.delete(id);
          }
          return { syncInProgress: newSet };
        });
      }
    }),
    { name: 'inventory-store' }
  )
);