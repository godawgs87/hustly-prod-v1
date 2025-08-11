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
    const condition = listingData.condition || 'Used';
    
    console.log('🔍 [EbayService] Extracting params from:', { title, brand, category, condition });
    
    // Smart reseller approach: Preserve valuable specificity from AI-generated titles
    let queryParts = [];
    
    // 1. For automotive parts, preserve the full context that buyers search for
    if (title.match(/OEM|Genuine|Original/i) && 
        (title.match(/Ford|GM|BMW|Mercedes|Toyota|Honda|Nissan|Volkswagen/i) || 
         title.match(/[A-Z0-9]{2,4}-[A-Z0-9]{5,}/i))) {
      
      // Extract year range (e.g., "2022-2025")
      const yearRange = title.match(/20\d{2}[-–]20\d{2}/)?.[0];
      
      // Extract make (Ford, BMW, etc.)
      const make = title.match(/(Ford|GM|Chevrolet|BMW|Mercedes|Toyota|Honda|Nissan|Volkswagen|Audi|Lexus)/i)?.[0];
      
      // Extract model (F-150 Lightning, Mustang, 3 Series, etc.)
      const modelMatch = title.match(/(F-150 Lightning|F-150|Mustang|Explorer|Escape|Corvette|Camaro|3 Series|C-Class|Camry|Accord|Altima)/i)?.[0];
      
      // Extract part type (Smart Key Fob, Remote, etc.)
      const partType = title.match(/(Smart Key Fob|Key Fob|Remote|Keyless Entry|Smart Key)/i)?.[0];
      
      // Extract part number (NL3T-15K601-EC, etc.)
      const partNumber = title.match(/[A-Z0-9]{2,4}-[A-Z0-9]{5,}[A-Z0-9]*/i)?.[0];
      
      // Build automotive query with the components that matter
      if (make && partNumber) {
        queryParts = [
          'OEM',
          yearRange,
          make,
          modelMatch,
          partType,
          partNumber
        ].filter(Boolean);
        
        console.log('🚗 [EbayService] Automotive query components:', {
          yearRange, make, model: modelMatch, partType, partNumber
        });
      }
    }
    
    // 2. For non-automotive items, use smart extraction
    if (queryParts.length === 0) {
      // Extract brand if meaningful
      if (brand && brand.toLowerCase() !== 'unknown' && brand.toLowerCase() !== 'unbranded') {
        queryParts.push(brand);
      }
      
      // Extract model/part numbers (universal patterns)
      const identifierPatterns = [
        /\b([A-Z0-9]{2,}-[A-Z0-9]{3,})\b/g,     // ABC-123 style
        /\b([A-Z]{2,}[0-9]{3,}[A-Z0-9]*)\b/g,   // ABC123X style
        /\b(Model\s*[:#]?\s*([A-Z0-9-]+))\b/gi  // Model: ABC123
      ];
      
      const foundIdentifiers = new Set();
      identifierPatterns.forEach(pattern => {
        const matches = title.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const clean = match.replace(/Model\s*[:#]?\s*/gi, '').trim();
            if (clean.length >= 3 && clean.length <= 20) {
              foundIdentifiers.add(clean);
            }
          });
        }
      });
      
      // Add the most specific identifier
      if (foundIdentifiers.size > 0) {
        const bestIdentifier = Array.from(foundIdentifiers)
          .sort((a: string, b: string) => b.length - a.length)[0];
        queryParts.push(bestIdentifier);
      }
      
      // Add 2-3 key descriptive words
      const titleWords = title.split(/\s+/)
        .filter(word => {
          const skip = ['the', 'and', 'for', 'with', 'new', 'used', 'oem', 'genuine', 'original'];
          return word.length > 2 && !skip.includes(word.toLowerCase());
        })
        .filter(word => !/^[0-9]+$/.test(word) && !/^[A-Z]$/.test(word));
      
      const descriptiveWords = titleWords
        .filter(word => {
          const wordLower = word.toLowerCase();
          return wordLower !== brand?.toLowerCase() && 
                 !foundIdentifiers.has(word) &&
                 !queryParts.some(part => typeof part === 'string' && part.toLowerCase() === wordLower);
        })
        .slice(0, 3);
      
      queryParts.push(...descriptiveWords);
    }
    
    // 3. Remove duplicates and limit to 6 terms max
    const uniqueQueryParts = [];
    const seen = new Set();
    queryParts.forEach(part => {
      if (part && typeof part === 'string') {
        const lower = part.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueQueryParts.push(part);
        }
      }
    });
    
    const query = uniqueQueryParts.slice(0, 6).join(' ').trim();
    
    console.log('🎯 [EbayService] Smart query built:', {
      query,
      brand,
      condition,
      termCount: uniqueQueryParts.length,
      isAutomotive: title.match(/OEM|Genuine/i) ? true : false
    });
    
    return {
      query: query || title.split(' ').slice(0, 5).join(' '), // Fallback to first 5 words
      brand: brand || undefined,
      condition: listingData.condition || undefined
    };
  }


}