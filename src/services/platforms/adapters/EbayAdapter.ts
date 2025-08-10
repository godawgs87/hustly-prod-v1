import { BasePlatformAdapter } from '../BasePlatformAdapter';
import type { 
  PlatformAdapter, 
  UnifiedListing, 
  PlatformListing, 
  SyncResult, 
  BulkOperation, 
  BulkResult,
  PlatformFeatures,
  PlatformCategory,
  PlatformCredentials,
  PlatformListingResult,
  OfferAction
} from '@/types/platform';

import { EbayService } from '@/services/api/ebayService';
import { supabase } from '@/integrations/supabase/client';

export class EbayAdapter extends BasePlatformAdapter {
  constructor() {
    super(
      'ebay',
      'eBay',
      '🛒',
      {
        // Basic capabilities
        listing: true,
        bulkListing: true,
        scheduling: true,
        
        // Pricing capabilities
        offers: true,
        autoPrice: true,
        pricingRules: true,
        
        // Inventory management
        inventorySync: true,
        quantityManagement: true,
        variations: true,
        
        // Shipping
        calculatedShipping: true,
        shippingPolicies: true,
        internationalShipping: true,
        
        // Advanced features
        promotions: true,
        analytics: true,
        messaging: true,
        
        // Limits
        maxPhotos: 12,
        maxTitleLength: 80,
        maxDescriptionLength: 4000,
        supportedCategories: ['all'] // eBay supports all categories
      }
    );
  }

  protected validateCredentials(credentials: PlatformCredentials): void {
    if (!credentials.accessToken && !credentials.refreshToken) {
      throw new Error('eBay access token or refresh token is required');
    }
  }

  protected async performConnection(): Promise<void> {
    // Check if we have valid eBay credentials in the database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: account } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('marketplace', 'ebay')
      .single();

    if (!account || !account.oauth_token) {
      throw new Error('eBay account not connected');
    }

    // Store credentials for use in API calls
    this.credentials = {
      accessToken: account.oauth_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at
    };
  }

  protected async performDisconnection(): Promise<void> {
    // Clean up any eBay-specific resources
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('marketplace_accounts')
        .update({ 
          oauth_token: null,
          refresh_token: null,
          token_expires_at: null,
          is_connected: false
        })
        .eq('user_id', user.id)
        .eq('marketplace', 'ebay');
    }
  }

  protected async checkConnectionStatus(): Promise<boolean> {
    try {
      // Use testConnection to validate connection
      const result = await EbayService.testConnection();
      return result?.success || false;
    } catch (error) {
      return false;
    }
  }

  async createListing(listing: UnifiedListing): Promise<PlatformListingResult> {
    try {
      const ebayData = this.transformToEbayFormat(listing);
      const sku = `SKU-${Date.now()}`;
      
      // Create inventory item with proper parameters
      const result = await EbayService.createInventoryItem(sku, ebayData, listing.photos);
    
    // Create offer for the inventory item
    const offerData = {
      sku: ebayData.sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      pricingSummary: {
        price: {
          value: listing.price.toString(),
          currency: 'USD'
        }
      },
      merchantLocationKey: 'default'
    };
    
    const offerResult = await EbayService.createOffer(offerData);
    
    // Publish the offer
    if (offerResult.offerId) {
      await EbayService.publishOffer(offerResult.offerId);
    }
    
    return {
      success: true,
      platformListingId: offerResult.offerId,
      url: offerResult.listingUrl,
      errors: []
    } as PlatformListingResult;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create listing']
      };
    }
  }

  async updateListing(listingId: string, updates: Partial<UnifiedListing>): Promise<void> {
    // For now, we'll use sync to update the listing
    // In a full implementation, this would update the inventory item
    await EbayService.syncListing(listingId);
  }

  async deleteListing(id: string): Promise<void> {
    // eBay doesn't have a direct delete in the current service
    // Would need to implement end listing functionality
    throw new Error('Delete listing not yet implemented for eBay');
  }

  async syncListing(id: string): Promise<SyncResult> {
    try {
      // Use the sync listing method
      const result = await EbayService.syncListing(id);
      
      return {
        views: result.views || 0,
        watchers: result.watchers || 0,
        offers: 0, // eBay offers would come from a different API
        status: this.mapEbayStatus(result.status),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to sync listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async manageOffers(offerId: string, action: OfferAction): Promise<void> {
    // Offer management would need to be implemented in the eBay service
    throw new Error('Offer management not yet implemented for eBay');
  }

  async getPolicies(): Promise<any[]> {
    // Business policies would need to be implemented in the eBay service
    return [];
  }

  async refreshPolicies(): Promise<void> {
    // Business policies refresh would need to be implemented
    console.log('Policy refresh not yet implemented for eBay');
  }

  private transformToEbayFormat(listing: UnifiedListing): any {
    return {
      title: listing.title?.substring(0, this.capabilities.maxTitleLength),
      description: listing.description,
      startPrice: listing.price,
      categoryId: this.mapCategoryToEbay(listing.category),
      conditionId: this.mapConditionToEbay(listing.condition),
      quantity: listing.quantity || 1,
      images: listing.photos?.slice(0, this.capabilities.maxPhotos) || [],
      itemSpecifics: this.buildItemSpecifics(listing),
      shippingDetails: listing.shipping ? {
        shippingServiceOptions: [{
          shippingService: listing.shipping.service || 'USPSPriority',
          shippingServiceCost: listing.shipping.price || 0,
          shippingServicePriority: 1
        }]
      } : undefined
    };
  }

  private mapCategoryToEbay(category: string): string {
    // This would use the existing EbayCategoryService
    // For now, return a default category
    return '15724'; // Default to Clothing category
  }

  private mapConditionToEbay(condition: string): string {
    const conditionMap: Record<string, string> = {
      'new': '1000',
      'like-new': '1500',
      'good': '3000',
      'fair': '4000',
      'poor': '5000'
    };
    return conditionMap[condition] || '3000';
  }

  private mapEbayStatus(status: string | undefined): 'active' | 'sold' | 'ended' | 'draft' | 'error' {
    switch (status) {
      case 'Active':
        return 'active';
      case 'Sold':
        return 'sold';
      case 'Ended':
        return 'ended';
      case 'Draft':
        return 'draft';
      default:
        return 'error';
    }
  }

  private buildItemSpecifics(listing: UnifiedListing): any[] {
    const specifics = [];
    
    if (listing.brand) {
      specifics.push({ name: 'Brand', value: listing.brand });
    }
    if (listing.size) {
      specifics.push({ name: 'Size', value: listing.size });
    }
    if (listing.color) {
      specifics.push({ name: 'Color', value: listing.color });
    }
    if (listing.material) {
      specifics.push({ name: 'Material', value: listing.material });
    }
    
    return specifics;
  }

  async getCategories(parentId?: string): Promise<PlatformCategory[]> {
    try {
      // If no parentId, get root categories
      if (!parentId) {
        const { data, error } = await supabase
          .rpc('get_root_categories');
        
        if (error) throw error;
        
        return (data || []).map((cat: any) => ({
          id: cat.ebay_category_id,
          name: cat.category_name,
          parentId: cat.parent_ebay_category_id,
          isLeaf: cat.leaf_category,
          path: cat.category_name
        }));
      }
      
      // Get child categories
      const { data, error } = await supabase
        .rpc('get_child_categories', { parent_id: parentId });
      
      if (error) throw error;
      
      return (data || []).map((cat: any) => ({
        id: cat.ebay_category_id,
        name: cat.category_name,
        parentId: cat.parent_ebay_category_id,
        isLeaf: cat.leaf_category,
        path: cat.category_name
      }));
    } catch (error) {
      console.error('Error fetching eBay categories:', error);
      return [];
    }
  }

  async searchCategories(query: string): Promise<PlatformCategory[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_categories', { search_term: query });
      
      if (error) throw error;
      
      // Type guard to ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Unexpected response from search_categories');
        return [];
      }
      
      return data.map((cat: any) => ({
        id: cat.ebay_category_id,
        name: cat.category_name,
        parentId: cat.parent_ebay_category_id,
        isLeaf: cat.leaf_category,
        path: cat.full_path || cat.category_name
      }));
    } catch (error) {
      console.error('Error searching eBay categories:', error);
      return [];
    }
  }
}
