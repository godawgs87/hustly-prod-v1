import { supabase } from '@/integrations/supabase/client';

export class EbayService {
  private static async makeApiCall(action: string, params: any = {}) {
    console.log('🚀 [Frontend] Making eBay API call:', {
      action,
      params,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('ebay-api-client', {
      body: { action, ...params }
    });

    console.log('📡 [Frontend] eBay API response:', {
      hasData: !!data,
      hasError: !!error,
      data: data,
      error: error,
      action: action
    });

    if (error) {
      console.error('❌ [Frontend] eBay API Error:', error);
      throw new Error(`eBay API Error: ${error.message}`);
    }

    console.log('✅ [Frontend] eBay API success for action:', action, data);
    return data;
  }

  private static async makeInventoryCall(action: string, params: any = {}) {
    const { data, error } = await supabase.functions.invoke('ebay-inventory-operations', {
      body: { action, ...params }
    });

    if (error) {
      throw new Error(`eBay Inventory Error: ${error.message}`);
    }

    return data;
  }

  static async testConnection() {
    return await this.makeApiCall('test_connection');
  }

  static async createInventoryItem(sku: string, listing: any, photos: any[]) {
    return await this.makeInventoryCall('create_inventory_item', { sku, listing, photos });
  }

  static async getExistingOffers(sku: string) {
    return await this.makeInventoryCall('get_existing_offers', { sku });
  }

  static async createOffer(offerData: any) {
    return await this.makeInventoryCall('create_offer', { offerData });
  }

  static async publishOffer(offerId: string) {
    return await this.makeInventoryCall('publish_offer', { offerId });
  }

  static async syncListing(listingId: string, options: { dryRun?: boolean } = {}) {
    const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
      body: { listingId, ...options }
    });

    if (error) {
      throw new Error(`eBay Sync Error: ${error.message}`);
    }

    return data;
  }

  static async validateListing(listing: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = [];
    
    if (!listing.title) errors.push('title');
    if (!listing.price) errors.push('price'); 
    if (!listing.description) errors.push('description');
    if (!listing.condition) errors.push('condition');
    if (!listing.ebay_category_id) errors.push('eBay category');
    
    return { isValid: errors.length === 0, errors };
  }

  static async bulkSyncListings(listings: any[], options: { batchSize?: number } = {}) {
    const batchSize = options.batchSize || 5;
    const results = [];
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      const batchPromises = batch.map(listing => 
        this.syncListing(listing.id, { dryRun: false })
          .then(result => ({ listingId: listing.id, status: 'success', data: result }))
          .catch(error => ({ listingId: listing.id, status: 'error', error: error.message }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < listings.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return {
      success: true,
      results,
      totalProcessed: results.length,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length
    };
  }

  // Price Research Methods
  static async searchCompletedListings(params: {
    query: string;
    category?: string;
    brand?: string;
    condition?: string;
    limit?: number;
  }) {
    console.log('🔍 [EbayService] Searching completed listings:', params);
    return await this.makeApiCall('search_completed_listings', params);
  }

  static async getPriceSuggestion(searchResults: any) {
    console.log('💰 [EbayService] Getting price suggestion from search results');
    return await this.makeApiCall('get_price_suggestion', { searchResults });
  }

  static async researchItemPrice(params: {
    query: string;
    category?: string;
    brand?: string;
    condition?: string;
    limit?: number;
  }) {
    console.log('🔬 [EbayService] Researching item price:', params);
    try {
      const result = await this.makeApiCall('research_item_price', params);
      console.log('✅ [EbayService] Price research complete:', {
        totalComps: result.data?.searchResults?.total || 0,
        suggestedPrice: result.data?.priceAnalysis?.suggestedPrice || 0,
        confidence: result.data?.priceAnalysis?.confidence || 'unknown'
      });
      return result;
    } catch (error) {
      console.error('❌ [EbayService] Price research failed:', error);
      throw error;
    }
  }

  private static extractPriceResearchParams(listingData: any) {
    const title = listingData.title || '';
    const description = listingData.description || '';
    const brand = listingData.brand || '';
    const category = listingData.category?.name || '';
    
    // Create a more focused search query
    let searchTerms = [];
    
    // Add brand if available
    if (brand && brand.toLowerCase() !== 'unknown') {
      searchTerms.push(brand);
    }
    
    // Extract key model/part numbers from title
    const modelMatch = title.match(/([A-Z0-9]{3,}-[A-Z0-9]{3,}|[A-Z0-9]{6,})/i);
    if (modelMatch) {
      searchTerms.push(modelMatch[0]);
    }
    
    // Add key product type words
    const productTypes = ['key fob', 'remote', 'keyless', 'entry', 'transmitter'];
    const titleLower = title.toLowerCase();
    productTypes.forEach(type => {
      if (titleLower.includes(type)) {
        searchTerms.push(type);
      }
    });
    
    // Add category context if relevant
    if (category && category.toLowerCase() !== 'other') {
      searchTerms.push(category.toLowerCase());
    }
    
    // Create focused query (limit to most relevant terms)
    const query = searchTerms.slice(0, 4).join(' ');
    
    console.log('🏷️ [EbayService] Extracted price research params:', {
      query,
      brand: brand || undefined,
      condition: listingData.condition || undefined
    });
    
    return {
      query,
      brand: brand || undefined,
      condition: listingData.condition || undefined
    };
  }
}