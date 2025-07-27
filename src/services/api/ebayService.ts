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
    
    // Extract model numbers and part numbers from title (more comprehensive patterns)
    const modelPatterns = [
      /([A-Z]{2,}[0-9]{3,}[A-Z]*)/g,  // DCF888B, XR20V, etc.
      /([0-9]{1,2}V\s*MAX)/gi,        // 20V MAX, 18V MAX
      /([A-Z0-9]{3,}-[A-Z0-9]{3,})/g, // ABC-123, XYZ-456
      /(Model\s*[:#]?\s*([A-Z0-9-]+))/gi // Model: ABC123
    ];
    
    modelPatterns.forEach(pattern => {
      const matches = title.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.replace(/Model\s*[:#]?\s*/gi, '').trim();
          if (cleanMatch.length >= 3) {
            searchTerms.push(cleanMatch);
          }
        });
      }
    });
    
    // Extract product type keywords based on category and title
    const productTypeKeywords = {
      'Tools & Hardware': ['drill', 'driver', 'impact', 'saw', 'grinder', 'sander', 'wrench', 'screwdriver', 'hammer', 'pliers'],
      'Automotive': ['key fob', 'remote', 'keyless', 'entry', 'transmitter', 'starter', 'alarm', 'car', 'vehicle'],
      'Electronics': ['phone', 'tablet', 'laptop', 'headphones', 'speaker', 'charger', 'cable', 'camera', 'tv', 'monitor'],
      'Clothing': ['shirt', 'pants', 'dress', 'jacket', 'shoes', 'boots', 'sneakers', 'coat', 'sweater'],
      'Home & Garden': ['lamp', 'chair', 'table', 'vase', 'plant', 'tool', 'kitchen', 'toaster', 'blender', 'microwave', 'coffee maker', 'mixer'],
      'Sports': ['ball', 'bat', 'glove', 'helmet', 'jersey', 'equipment', 'gear', 'fitness'],
      'Kitchen': ['toaster', 'blender', 'microwave', 'coffee maker', 'mixer', 'oven', 'fryer', 'grill', 'pot', 'pan'],
      'Appliances': ['toaster', 'blender', 'microwave', 'coffee maker', 'mixer', 'vacuum', 'iron', 'steamer']
    };
    
    // Find relevant product type keywords
    const titleLower = title.toLowerCase();
    const categoryKeywords = productTypeKeywords[category] || [];
    
    // Add category-specific keywords
    categoryKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        searchTerms.push(keyword);
      }
    });
    
    // Extract size and quantity descriptors
    const sizeDescriptors = [
      /\b(\d+)[-\s]?(slice|cup|quart|gallon|inch|ft|piece|pack|set)s?\b/gi,
      /\b(small|medium|large|extra large|xl|mini|compact|full size)\b/gi,
      /\b(single|double|triple|quad)\b/gi
    ];
    
    sizeDescriptors.forEach(pattern => {
      const matches = title.match(pattern);
      if (matches) {
        matches.forEach(match => {
          searchTerms.push(match.trim());
        });
      }
    });
    
    // Extract feature descriptors
    const featureKeywords = [
      'brushless', 'cordless', 'battery', 'rechargeable', 'wireless', 'bluetooth',
      'digital', 'analog', 'automatic', 'manual', 'programmable', 'smart',
      'stainless steel', 'black', 'white', 'red', 'blue', 'silver',
      'led', 'lcd', 'touch', 'voice', 'remote control'
    ];
    
    featureKeywords.forEach(keyword => {
      if (titleLower.includes(keyword.toLowerCase())) {
        searchTerms.push(keyword);
      }
    });
    
    // Extract year if present (for better matching)
    const yearMatch = title.match(/(20[0-9]{2})/);
    if (yearMatch) {
      searchTerms.push(yearMatch[0]);
    }
    
    // Create focused query with intelligent prioritization
    const uniqueTerms = [...new Set(searchTerms)];
    
    // Build query with priority: brand + product type + key descriptors + model
    let queryParts = [];
    
    // Always include brand if available
    if (brand && brand.toLowerCase() !== 'unknown') {
      queryParts.push(brand);
    }
    
    // Add the most relevant product type and descriptors (prioritize longer, more specific terms)
    const sortedTerms = uniqueTerms
      .filter(term => term !== brand) // Don't duplicate brand
      .sort((a, b) => {
        // Prioritize terms with numbers (like "2-slice")
        const aHasNumber = /\d/.test(a);
        const bHasNumber = /\d/.test(b);
        if (aHasNumber && !bHasNumber) return -1;
        if (!aHasNumber && bHasNumber) return 1;
        
        // Then prioritize longer terms (more specific)
        return b.length - a.length;
      })
      .slice(0, 4); // Take top 4 most relevant terms
    
    queryParts.push(...sortedTerms);
    
    const query = queryParts.join(' ').trim();
    
    console.log('🏷️ [EbayService] Extracted price research params:', {
      query,
      brand: brand || undefined,
      condition: listingData.condition || undefined,
      extractedTerms: uniqueTerms
    });
    
    return {
      query,
      brand: brand || undefined,
      condition: listingData.condition || undefined
    };
  }
}