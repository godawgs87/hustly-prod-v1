import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

export interface SyncConflict {
  listingId: string;
  conflictType: 'simultaneous_sale' | 'offer_collision' | 'inventory_mismatch';
  platforms: string[];
  details: {
    timestamp: string;
    data: any;
  };
  resolution?: 'auto_resolved' | 'manual_required';
}

export interface InventorySyncStatus {
  listingId: string;
  platform: string;
  status: 'synced' | 'pending' | 'conflict' | 'error';
  lastSync: string;
  conflicts?: SyncConflict[];
}

export class InventorySyncService {
  private static syncQueue = new Map<string, boolean>();
  private static conflictHandlers = new Map<string, (conflict: SyncConflict) => Promise<void>>();

  /**
   * Sync a listing across all active platforms
   */
  static async syncListingAcrossPlatforms(listingId: string): Promise<InventorySyncStatus[]> {
    try {
      console.log('🔄 Starting multi-platform sync for listing:', listingId);
      
      // Prevent concurrent syncs of the same listing
      if (this.syncQueue.get(listingId)) {
        throw new Error('Sync already in progress for this listing');
      }
      this.syncQueue.set(listingId, true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Get the listing and its current platform listings
      const [listing, platformListings] = await Promise.all([
        this.getListingById(listingId),
        this.getPlatformListings(listingId)
      ]);

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Get active platforms for this user
      const activePlatforms = await this.getActivePlatforms(user.id);
      
      // Sync status array
      const syncStatuses: InventorySyncStatus[] = [];

      // Process each platform
      for (const platform of activePlatforms) {
        try {
          const existingPlatformListing = platformListings.find(pl => pl.platform === platform.id);
          
          if (existingPlatformListing) {
            // Update existing platform listing
            const status = await this.updatePlatformListing(existingPlatformListing.id, listing);
            syncStatuses.push({
              listingId,
              platform: platform.id,
              status: status ? 'synced' : 'error',
              lastSync: new Date().toISOString()
            });
          } else if (platform.settings.autoList) {
            // Create new platform listing
            const platformListingId = await this.createPlatformListing(listingId, platform.id, listing);
            syncStatuses.push({
              listingId,
              platform: platform.id,
              status: platformListingId ? 'synced' : 'error',
              lastSync: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`❌ Failed to sync to ${platform.id}:`, error);
          syncStatuses.push({
            listingId,
            platform: platform.id,
            status: 'error',
            lastSync: new Date().toISOString()
          });
        }
      }

      // Check for conflicts
      const conflicts = await this.detectConflicts(listingId);
      if (conflicts.length > 0) {
        await this.handleConflicts(conflicts);
        
        // Update sync statuses with conflicts
        syncStatuses.forEach(status => {
          const platformConflicts = conflicts.filter(c => c.platforms.includes(status.platform));
          if (platformConflicts.length > 0) {
            status.status = 'conflict';
            status.conflicts = platformConflicts;
          }
        });
      }

      return syncStatuses;
    } catch (error) {
      console.error('❌ Multi-platform sync failed:', error);
      throw error;
    } finally {
      this.syncQueue.delete(listingId);
    }
  }

  /**
   * Handle inventory conflicts when item sells on multiple platforms
   */
  static async handleSimultaneousSale(listingId: string, platforms: string[]): Promise<void> {
    try {
      console.log('⚠️ Handling simultaneous sale conflict:', { listingId, platforms });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Get platform listings
      const { data: platformListings, error } = await supabase
        .from('platform_listings')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', user.id)
        .in('platform', platforms);

      if (error) throw error;

      if (platformListings && platformListings.length > 1) {
        // Sort by sale timestamp (if available) or creation date
        const sortedListings = platformListings.sort((a, b) => {
          const aPlatformData = a.platform_data as any;
          const bPlatformData = b.platform_data as any;
          const aTime = aPlatformData?.sale_date || a.created_at;
          const bTime = bPlatformData?.sale_date || b.created_at;
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        });

        // Keep the first sale, cancel others
        const [winnerListing, ...loserListings] = sortedListings;

        // Update winner to sold status
        await supabase
          .from('platform_listings')
          .update({ 
            status: 'sold',
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          })
          .eq('id', winnerListing.id);

        // Cancel other listings
        for (const loserListing of loserListings) {
          await supabase
            .from('platform_listings')
            .update({ 
              status: 'ended',
              sync_status: 'cancelled_due_to_conflict',
              sync_errors: ['Cancelled due to simultaneous sale on another platform'],
              updated_at: new Date().toISOString()
            })
            .eq('id', loserListing.id);

          // TODO: Call platform API to actually cancel the listing
          await this.cancelPlatformListing(loserListing.platform, loserListing.platform_listing_id);
        }

        // Update main listing status
        await supabase
          .from('listings')
          .update({ 
            status: 'sold',
            sold_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', listingId);

        console.log('✅ Simultaneous sale conflict resolved - kept', winnerListing.platform);
      }
    } catch (error) {
      console.error('❌ Failed to handle simultaneous sale:', error);
      throw error;
    }
  }

  /**
   * Get real-time sync status for a listing
   */
  static async getSyncStatus(listingId: string): Promise<InventorySyncStatus[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data: platformListings, error } = await supabase
        .from('platform_listings')
        .select('*')
        .eq('listing_id', listingId)
        .eq('user_id', user.id);

      if (error) throw error;

      return (platformListings || []).map(pl => ({
        listingId,
        platform: pl.platform,
        status: pl.sync_status as 'synced' | 'pending' | 'conflict' | 'error',
        lastSync: pl.last_synced_at || pl.updated_at
      }));
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time inventory updates
   */
  static subscribeToInventoryUpdates(callback: (update: InventorySyncStatus) => void) {
    const channel = supabase
      .channel('inventory-sync-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_listings'
        },
        (payload) => {
          const platformListing = payload.new as any;
          if (platformListing) {
            callback({
              listingId: platformListing.listing_id,
              platform: platformListing.platform,
              status: platformListing.sync_status,
              lastSync: platformListing.last_synced_at || platformListing.updated_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Private helper methods
  private static async getListingById(listingId: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (error) {
      console.error('❌ Failed to get listing:', error);
      return null;
    }

    return data as Listing;
  }

  private static async getPlatformListings(listingId: string) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication required');

    const { data, error } = await supabase
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  }

  private static async getActivePlatforms(userId: string) {
    // Mock data for now - would fetch from marketplace_accounts
    return [
      {
        id: 'ebay',
        name: 'eBay',
        settings: { autoList: true }
      },
      {
        id: 'mercari',
        name: 'Mercari',
        settings: { autoList: false }
      }
    ];
  }

  private static async updatePlatformListing(platformListingId: string, listing: Listing): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('platform_listings')
        .update({
          platform_data: {
            title: listing.title,
            price: listing.price,
            description: listing.description,
            condition: listing.condition
          },
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
          updated_at: new Date().toISOString()
        })
        .eq('id', platformListingId);

      return !error;
    } catch (error) {
      console.error('❌ Failed to update platform listing:', error);
      return false;
    }
  }

  private static async createPlatformListing(listingId: string, platform: string, listing: Listing): Promise<string | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data, error } = await supabase
        .from('platform_listings')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          marketplace_account_id: `${platform}-account-${user.id}`, // Mock for now
          platform,
          platform_data: {
            title: listing.title,
            price: listing.price,
            description: listing.description,
            condition: listing.condition
          },
          status: 'draft',
          sync_status: 'pending',
          auto_relist: false,
          relist_count: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('❌ Failed to create platform listing:', error);
      return null;
    }
  }

  private static async detectConflicts(listingId: string): Promise<SyncConflict[]> {
    // TODO: Implement conflict detection logic
    // This would check for simultaneous sales, price mismatches, etc.
    return [];
  }

  private static async handleConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      if (conflict.conflictType === 'simultaneous_sale') {
        await this.handleSimultaneousSale(conflict.listingId, conflict.platforms);
      }
      // TODO: Handle other conflict types
    }
  }

  private static async cancelPlatformListing(platform: string, platformListingId: string | null): Promise<void> {
    // TODO: Implement platform-specific cancellation logic
    console.log(`📤 Would cancel listing ${platformListingId} on ${platform}`);
  }
}
