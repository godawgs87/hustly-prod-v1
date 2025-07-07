import { supabase } from '@/integrations/supabase/client';
import type { Platform, CrossListingRule, ListingOffer, PlatformListing } from '@/types/Platform';

export class PlatformService {
  static async getPlatforms(): Promise<Platform[]> {
    try {
      console.log('🔄 PlatformService.getPlatforms called');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // For now, return mock data - in the future this would fetch from marketplace_accounts
      const platforms: Platform[] = [
        {
          id: 'ebay',
          name: 'eBay',
          icon: '🛒',
          isActive: true,
          settings: {
            autoList: true,
            autoDelist: false,
            autoPrice: true,
            offerManagement: true
          },
          fees: {
            listingFee: 0.35,
            finalValueFee: 12.9,
            paymentProcessingFee: 2.9
          }
        },
        {
          id: 'mercari',
          name: 'Mercari',
          icon: '📦',
          isActive: false,
          settings: {
            autoList: false,
            autoDelist: true,
            autoPrice: false,
            offerManagement: true
          },
          fees: {
            listingFee: 0,
            finalValueFee: 10,
            paymentProcessingFee: 2.9
          }
        },
        {
          id: 'poshmark',
          name: 'Poshmark',
          icon: '👗',
          isActive: false,
          settings: {
            autoList: false,
            autoDelist: false,
            autoPrice: false,
            offerManagement: false
          },
          fees: {
            listingFee: 0,
            finalValueFee: 20,
            paymentProcessingFee: 0
          }
        }
      ];

      return platforms;
    } catch (error: any) {
      console.error('❌ PlatformService.getPlatforms failed:', error);
      throw error;
    }
  }

  static async getCrossListingRules(): Promise<CrossListingRule[]> {
    try {
      console.log('🔄 PlatformService.getCrossListingRules called');
      
      // Mock data for now
      const rules: CrossListingRule[] = [
        {
          id: 'electronics-rule',
          name: 'Electronics Auto-List',
          platforms: ['ebay', 'mercari'],
          conditions: {
            category: ['Electronics', 'Computers'],
            priceRange: { min: 50, max: 500 }
          },
          settings: {
            autoList: true,
            priceMultiplier: 1.1,
            titleTemplate: '{title} - Fast Shipping!',
            descriptionTemplate: '{description}\n\nShips within 24 hours!'
          }
        }
      ];

      return rules;
    } catch (error: any) {
      console.error('❌ PlatformService.getCrossListingRules failed:', error);
      throw error;
    }
  }

  static async getListingOffers(): Promise<ListingOffer[]> {
    try {
      console.log('🔄 PlatformService.getListingOffers called');
      
      // Mock data for now
      const offers: ListingOffer[] = [
        {
          id: 'offer-1',
          listingId: 'listing-1',
          platform: 'ebay',
          offerType: 'price_drop',
          originalPrice: 100,
          offerPrice: 85,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];

      return offers;
    } catch (error: any) {
      console.error('❌ PlatformService.getListingOffers failed:', error);
      throw error;
    }
  }

  static async getPlatformListings(): Promise<PlatformListing[]> {
    try {
      console.log('🔄 PlatformService.getPlatformListings called');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('platform_listings')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Failed to fetch platform listings:', error);
        throw new Error(error.message);
      }

      // Transform database schema to PlatformListing interface
      const platformListings: PlatformListing[] = (data || []).map(item => ({
        id: item.id,
        listingId: item.listing_id,
        platform: item.platform,
        platformListingId: item.platform_listing_id || '',
        status: item.status as 'active' | 'sold' | 'ended' | 'draft',
        views: (item.performance_metrics as any)?.views || 0,
        watchers: (item.performance_metrics as any)?.watchers || 0,
        offers: (item.performance_metrics as any)?.offers || 0,
        lastSynced: item.last_synced_at || new Date().toISOString()
      }));

      return platformListings;
    } catch (error: any) {
      console.error('❌ PlatformService.getPlatformListings failed:', error);
      throw error;
    }
  }

  static async createCrossListingRule(rule: Omit<CrossListingRule, 'id'>): Promise<CrossListingRule> {
    try {
      console.log('📝 PlatformService.createCrossListingRule called');
      
      // Mock implementation - would save to database in real version
      const newRule: CrossListingRule = {
        ...rule,
        id: `rule-${Date.now()}`
      };

      return newRule;
    } catch (error: any) {
      console.error('❌ PlatformService.createCrossListingRule failed:', error);
      throw error;
    }
  }

  static async updateCrossListingRule(id: string, updates: Partial<CrossListingRule>): Promise<boolean> {
    try {
      console.log('🔄 PlatformService.updateCrossListingRule called:', id);
      
      // Mock implementation - would update in database in real version
      return true;
    } catch (error: any) {
      console.error('❌ PlatformService.updateCrossListingRule failed:', error);
      throw error;
    }
  }

  static async deleteCrossListingRule(id: string): Promise<boolean> {
    try {
      console.log('🗑️ PlatformService.deleteCrossListingRule called:', id);
      
      // Mock implementation - would delete from database in real version
      return true;
    } catch (error: any) {
      console.error('❌ PlatformService.deleteCrossListingRule failed:', error);
      throw error;
    }
  }

  static async createOffer(offer: Omit<ListingOffer, 'id' | 'createdAt'>): Promise<ListingOffer> {
    try {
      console.log('📝 PlatformService.createOffer called');
      
      // Mock implementation - would save to database in real version
      const newOffer: ListingOffer = {
        ...offer,
        id: `offer-${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      return newOffer;
    } catch (error: any) {
      console.error('❌ PlatformService.createOffer failed:', error);
      throw error;
    }
  }

  static async updateOffer(id: string, updates: Partial<ListingOffer>): Promise<boolean> {
    try {
      console.log('🔄 PlatformService.updateOffer called:', id);
      
      // Mock implementation - would update in database in real version
      return true;
    } catch (error: any) {
      console.error('❌ PlatformService.updateOffer failed:', error);
      throw error;
    }
  }

  static async cancelOffer(id: string): Promise<boolean> {
    try {
      console.log('❌ PlatformService.cancelOffer called:', id);
      
      // Mock implementation - would update status in database in real version
      return true;
    } catch (error: any) {
      console.error('❌ PlatformService.cancelOffer failed:', error);
      throw error;
    }
  }
}