import { supabase } from '@/integrations/supabase/client';

export interface TradingAPIListingData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  ebay_category_id: string;
  photos?: string[];
  brand?: string;
  mpn?: string;
  upc?: string;
  ean?: string;
  isbn?: string;
  shipping_cost?: number;
  shipping_service?: string;
  handling_time?: number;
  return_accepted?: boolean;
  return_period?: number;
  payment_methods?: string[];
}

export class EbayTradingService {
  /**
   * Create a new eBay listing using the Trading API
   * This bypasses business policy requirements for individual sellers
   */
  static async createListing(
    listingId: string, 
    listingData?: TradingAPIListingData
  ): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      console.log('🚀 [Trading API] Creating listing:', {
        listingId,
        hasListingData: !!listingData,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.functions.invoke('ebay-trading-api', {
        body: {
          action: 'create_listing',
          listingId,
          listingData
        }
      });

      if (error) {
        console.error('❌ [Trading API] Create listing error:', error);
        throw new Error(error.message);
      }

      console.log('✅ [Trading API] Listing created successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [Trading API] Create listing failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create listing'
      };
    }
  }

  /**
   * Update an existing eBay listing using the Trading API
   */
  static async updateListing(
    itemId: string,
    listingId: string,
    listingData: Partial<TradingAPIListingData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 [Trading API] Updating listing:', {
        itemId,
        listingId,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.functions.invoke('ebay-trading-api', {
        body: {
          action: 'update_listing',
          itemId,
          listingId,
          listingData
        }
      });

      if (error) {
        console.error('❌ [Trading API] Update listing error:', error);
        throw new Error(error.message);
      }

      console.log('✅ [Trading API] Listing updated successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [Trading API] Update listing failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update listing'
      };
    }
  }

  /**
   * End an eBay listing using the Trading API
   */
  static async endListing(
    itemId: string,
    listingId?: string,
    reason: string = 'NotAvailable'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🛑 [Trading API] Ending listing:', {
        itemId,
        listingId,
        reason,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.functions.invoke('ebay-trading-api', {
        body: {
          action: 'end_listing',
          itemId,
          listingId,
          reason
        }
      });

      if (error) {
        console.error('❌ [Trading API] End listing error:', error);
        throw new Error(error.message);
      }

      console.log('✅ [Trading API] Listing ended successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [Trading API] End listing failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to end listing'
      };
    }
  }

  /**
   * Check if user should use Trading API (individual seller) or Inventory API (business seller)
   * Based on the business_type field in user_profiles
   */
  static async shouldUseTradingAPI(userId: string): Promise<boolean> {
    try {
      // Check user's business type from their profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_type')
        .eq('user_id', userId)
        .single();

      if (!profile?.business_type) {
        // No business type set, default to individual (Trading API)
        console.log('No business type set, defaulting to Trading API for individual seller');
        return true;
      }

      // Individual and sole proprietorship use Trading API (no business policies required)
      if (profile.business_type === 'individual' || 
          profile.business_type === 'sole_proprietorship') {
        console.log(`Business type is ${profile.business_type}, using Trading API`);
        return true;
      }

      // LLC and Corporation use Inventory API (can create business policies)
      if (profile.business_type === 'llc' || 
          profile.business_type === 'corporation') {
        console.log(`Business type is ${profile.business_type}, using Inventory API`);
        return false;
      }

      // Default to Trading API for unknown business types
      console.log(`Unknown business type ${profile.business_type}, defaulting to Trading API`);
      return true;
    } catch (error) {
      console.error('Error checking business type:', error);
      // Default to Trading API on error
      return true;
    }
  }

  /**
   * Sync a listing to eBay using the appropriate API based on seller type
   */
  static async syncListing(listingId: string): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 [Trading API] Checking business type for user:', user.id);

      // Check if we should use Trading API
      const useTradingAPI = await this.shouldUseTradingAPI(user.id);
      
      console.log(`📡 [Sync] Using ${useTradingAPI ? 'Trading' : 'Inventory'} API for listing ${listingId}`);
      console.log('🔍 [Trading API] Business type decision:', { useTradingAPI, userId: user.id, listingId });

      if (useTradingAPI) {
        // Use Trading API (no business policies required)
        console.log('✅ [Trading API] Calling createListing for individual seller');
        return await this.createListing(listingId);
      } else {
        // Fall back to Inventory API for business accounts
        console.log('⚠️ [Trading API] Falling back to Inventory API for business account');
        const { EbayService } = await import('./ebayService');
        const result = await EbayService.syncListing(listingId);
        return {
          success: true,
          itemId: result?.offerId
        };
      }
    } catch (error: any) {
      console.error('❌ [Sync] Failed to sync listing:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync listing'
      };
    }
  }
}
