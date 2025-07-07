import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

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
}

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      listings: [],
      selectedIds: [],
      isLoading: false,
      error: null,
      usingFallback: false,
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
      
      addListing: (listing) => set((state) => {
        const newListings = [...state.listings, listing];
        const stats = {
          totalItems: newListings.length,
          totalValue: newListings.reduce((sum, item) => sum + (item.price || 0), 0),
          activeItems: newListings.filter(item => item.status === 'active').length,
          draftItems: newListings.filter(item => item.status === 'draft').length
        };
        return { listings: newListings, stats };
      }),
      
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
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            throw new Error('Authentication required');
          }

          const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          get().setListings((data || []) as Listing[]);
          set({ usingFallback: false });
        } catch (error: any) {
          set({ error: error.message, usingFallback: true });
        } finally {
          set({ isLoading: false });
        }
      },

      refetch: async () => {
        await get().fetchListings();
      }
    }),
    { name: 'inventory-store' }
  )
);