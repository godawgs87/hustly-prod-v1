import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

export interface InventoryLoadOptions {
  statusFilter?: string;
  categoryFilter?: string;
  limit?: number;
  search?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeItems: number;
  draftItems: number;
}

export class InventoryService {
  private static cacheKey = 'inventory_cache';
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  static async fetchInventory(options: InventoryLoadOptions = {}): Promise<Listing[]> {
    console.log('🔄 InventoryService.fetchInventory called with options:', options);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Start building the query
    let query = supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters
    if (options.statusFilter && options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter);
    }

    if (options.categoryFilter && options.categoryFilter !== 'all') {
      query = query.eq('category', options.categoryFilter);
    }

    if (options.search && options.search.length > 0) {
      const searchTerm = options.search.toLowerCase();
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Apply ordering and limit
    query = query.order('created_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch inventory:', error);
      throw new Error(error.message);
    }

    console.log(`✅ InventoryService loaded ${data?.length || 0} listings`);
    return (data || []) as Listing[];
  }

  static calculateStats(listings: Listing[]): InventoryStats {
    return {
      totalItems: listings.length,
      totalValue: listings.reduce((sum, item) => sum + (item.price || 0), 0),
      activeItems: listings.filter(item => item.status === 'active').length,
      draftItems: listings.filter(item => item.status === 'draft').length
    };
  }

  static getCachedData(userId?: string): Listing[] | null {
    try {
      const cached = localStorage.getItem(`${this.cacheKey}_${userId || 'default'}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > this.cacheExpiry;
      
      if (isExpired) {
        localStorage.removeItem(`${this.cacheKey}_${userId || 'default'}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading inventory cache:', error);
      return null;
    }
  }

  static setCachedData(data: Listing[], userId: string): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${this.cacheKey}_${userId}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error setting inventory cache:', error);
    }
  }

  static clearCache(userId?: string): void {
    try {
      if (userId) {
        localStorage.removeItem(`${this.cacheKey}_${userId}`);
      } else {
        // Clear all inventory caches
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.cacheKey)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Error clearing inventory cache:', error);
    }
  }

  static async refreshInventory(options: InventoryLoadOptions = {}): Promise<{
    data: Listing[];
    fromCache: boolean;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Try cache first for immediate response
    const cachedData = userId ? this.getCachedData(userId) : null;
    
    try {
      // Fetch fresh data
      const freshData = await this.fetchInventory(options);
      
      // Update cache
      if (userId && freshData.length > 0) {
        this.setCachedData(freshData, userId);
      }
      
      return { data: freshData, fromCache: false };
    } catch (error) {
      console.error('Failed to fetch fresh data, using cache:', error);
      
      if (cachedData && cachedData.length > 0) {
        return { data: cachedData, fromCache: true };
      }
      
      throw error;
    }
  }
}