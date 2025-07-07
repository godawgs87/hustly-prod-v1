import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';
import type { UnifiedInventoryOptions } from './types';

// Request deduplication map
const requestCache = new Map<string, Promise<Listing[]>>();

export const useInventoryApi = () => {
  const fetchInventory = useCallback(async (options: UnifiedInventoryOptions = {}): Promise<Listing[]> => {
    // Get authenticated user with retry logic
    let authAttempts = 0;
    let user = null;
    
    while (!user && authAttempts < 3) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
        break;
      } catch (authError: any) {
        authAttempts++;
        if (authError.message?.includes('503') && authAttempts < 3) {
          console.log(`🔄 Auth retry ${authAttempts}/3 due to 503 error`);
          await new Promise(resolve => setTimeout(resolve, 1000 * authAttempts));
          continue;
        }
        throw authError;
      }
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return [];
    }

    // Create cache key for request deduplication
    const requestKey = `${user.id}-${JSON.stringify(options)}`;
    
    // Check if request is already in progress
    if (requestCache.has(requestKey)) {
      console.log('🔄 Using existing request for deduplication');
      return requestCache.get(requestKey)!;
    }

    // Create the fetch promise
    const fetchPromise = (async (): Promise<Listing[]> => {
      try {
        console.log('🔍 Fetching unified inventory for user:', user.id);

        // Phase 1: Increased timeout to 30 seconds for better reliability
        const response = await supabase
          .from('listings')
          .select(`
            id, title, description, price, status, category, condition, 
            created_at, updated_at, user_id,
            purchase_price, photos, source_location, source_type,
            measurements, keywords, ebay_category_id, ebay_category_path
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(options.limit || 100)
          .abortSignal(AbortSignal.timeout(30000)); // Increased to 30 seconds

        if (response.error) {
          console.error('❌ Database error:', response.error);
          throw new Error(response.error.message);
        }

        const data = response.data || [];
        console.log('✅ Successfully fetched listings:', data.length);

        // Transform data with proper type casting
        const transformedData: Listing[] = data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          title: item.title,
          price: item.price,
          status: item.status || 'draft',
          category: item.category || 'Electronics',
          condition: item.condition || 'good',
          description: item.description || null,
          measurements: (item.measurements && typeof item.measurements === 'object' && !Array.isArray(item.measurements)) ? item.measurements as { length?: string; width?: string; height?: string; weight?: string } : {},
          keywords: Array.isArray(item.keywords) ? item.keywords : null,
          photos: Array.isArray(item.photos) ? item.photos : null,
          shipping_cost: 9.95,
          purchase_price: item.purchase_price || null,
          cost_basis: null,
          fees_paid: 0,
          net_profit: null,
          profit_margin: null,
          source_location: item.source_location || null,
          source_type: item.source_type || null,
          performance_notes: null,
          created_at: item.created_at,
          updated_at: item.updated_at || item.created_at,
          price_research: null,
          purchase_date: null,
          listed_date: null,
          sold_date: null,
          sold_price: null,
          days_to_sell: null,
          is_consignment: false,
          consignment_percentage: null,
          consignor_name: null,
          consignor_contact: null,
          category_id: null,
          gender: null,
          age_group: null,
          clothing_size: null,
          shoe_size: null,
          sku: null,
          auto_generate_sku: null,
          sku_prefix: null,
          ebay_category_id: item.ebay_category_id || null,
          ebay_category_path: item.ebay_category_path || null
        }));

        return transformedData;

      } catch (err: any) {
        console.error('❌ Failed to fetch inventory:', err);
        throw err;
      } finally {
        // Remove from request cache after completion
        requestCache.delete(requestKey);
      }
    })();

    // Store in request cache for deduplication
    requestCache.set(requestKey, fetchPromise);
    
    return fetchPromise;
  }, []);

  return {
    fetchInventory
  };
};