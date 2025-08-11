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
    
    // For better price accuracy, use a more comprehensive approach
    let searchTerms = [];
    
    // Always include brand if available and meaningful
    if (brand && brand.toLowerCase() !== 'unknown' && brand.length > 2) {
      searchTerms.push(brand);
    }
    
    // Extract core product name from title (first few meaningful words)
    const titleWords = title.split(' ').filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'size', 'color'].includes(word.toLowerCase())
    );
    
    // Add first 2-3 key product words (after brand if present)
    const productWords = titleWords.slice(brand ? 1 : 0, 4);
    searchTerms.push(...productWords);
    
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
    
    // Add specific product identifiers for common categories
    const categorySpecificTerms = {
      'Clothing': {
        'shoes': ['slides', 'sandals', 'sneakers', 'boots', 'loafers'],
        'apparel': ['shirt', 'pants', 'dress', 'jacket', 'coat']
      },
      'Toys': {
        'nerf': ['blaster', 'gun', 'dart', 'elite', 'disruptor'],
        'action': ['figure', 'toy', 'collectible']
      },
      'Electronics': ['phone', 'tablet', 'laptop', 'headphones', 'speaker'],
      'Tools': ['drill', 'driver', 'impact', 'saw', 'grinder']
    };
    
    // Add category-specific terms if they match
    const titleLower = title.toLowerCase();
    Object.entries(categorySpecificTerms).forEach(([cat, terms]) => {
      if (category.toLowerCase().includes(cat.toLowerCase())) {
        if (Array.isArray(terms)) {
          // Handle array of strings
          terms.forEach(keyword => {
            if (titleLower.includes(keyword.toLowerCase())) {
              searchTerms.push(keyword);
            }
          });
        } else if (typeof terms === 'object' && terms !== null) {
          // Handle nested object structure
          Object.values(terms).forEach((keywords: any) => {
            if (Array.isArray(keywords)) {
              keywords.forEach(keyword => {
                if (titleLower.includes(keyword.toLowerCase())) {
                  searchTerms.push(keyword);
                }
              });
            }
          });
        }
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
    
    // Extract feature descriptors (avoid duplicates)
    const featureKeywords = [
      'brushless', 'cordless', 'battery', 'rechargeable', 'wireless', 'bluetooth',
      'digital', 'analog', 'automatic', 'manual', 'programmable', 'smart',
      'stainless steel', 'black', 'white', 'red', 'blue', 'silver',
      'led', 'lcd', 'touch', 'voice', 'remote control'
    ];
    
    featureKeywords.forEach(keyword => {
      if (titleLower.includes(keyword.toLowerCase()) && 
          !searchTerms.some(term => term.toLowerCase() === keyword.toLowerCase())) {
        searchTerms.push(keyword);
      }
    });
    
    // Extract year if present (for better matching)
    const yearMatch = title.match(/(20[0-9]{2})/);
    if (yearMatch) {
      searchTerms.push(yearMatch[0]);
    }

    // Enhanced automotive part number detection and vehicle model identification
    const automotiveEnhancement = this.enhanceAutomotiveQuery(title, brand, searchTerms);
    if (automotiveEnhancement.vehicleModel) {
      searchTerms.push(...automotiveEnhancement.additionalTerms);
    }
    
    // Remove duplicates and create focused query (case-insensitive deduplication)
    const uniqueTerms = searchTerms
      .map(term => term.trim())
      .filter(term => term.length > 1)
      .filter((term, index, arr) => 
        arr.findIndex(t => t.toLowerCase() === term.toLowerCase()) === index
      );
    
    // Build comprehensive but focused query
    let queryParts = [];
    
    // Start with brand if available
    if (brand && brand.toLowerCase() !== 'unknown' && brand.length > 2) {
      queryParts.push(brand);
    }
    
    // Special handling for automotive OEM parts to improve specificity
    if (automotiveEnhancement.vehicleModel) {
      // For specific vehicle model parts, create highly targeted query
      const partNumber = title.match(/[A-Z0-9]{2,4}-?[A-Z0-9]{5,8}/i)?.[0];
      if (partNumber) {
        queryParts = [brand, automotiveEnhancement.vehicleModel, partNumber, 'OEM'].filter(Boolean);
        console.log('🚗 [EbayService] Using specialized automotive query for vehicle-specific part:', automotiveEnhancement.vehicleModel);
      } else {
        queryParts = [brand, automotiveEnhancement.vehicleModel, 'OEM'].filter(Boolean);
      }
    } else {
      // Add core product terms (prioritize meaningful words, avoid duplicates)
      const coreTerms = uniqueTerms
        .filter(term => 
          term.toLowerCase() !== brand.toLowerCase() && 
          term.length > 2 &&
          !['used', 'new', 'condition', 'item'].includes(term.toLowerCase())
        )
        .slice(0, 4); // Keep it focused but comprehensive
      
      queryParts.push(...coreTerms);
    }
    
    // Create the final query - remove any remaining duplicates
    const finalQueryParts = queryParts.filter((part, index, arr) => 
      arr.findIndex(p => p.toLowerCase() === part.toLowerCase()) === index
    );
    const query = finalQueryParts.join(' ').trim();
    
    console.log('🎯 [EbayService] Final search query:', query);
    console.log('📊 [EbayService] Query components:', { brand, condition });
    
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

  private static enhanceAutomotiveQuery(title: string, brand: string, existingTerms: string[]): {
    vehicleModel: string | null;
    additionalTerms: string[];
  } {
    const titleLower = title.toLowerCase();
    const additionalTerms: string[] = [];
    let vehicleModel: string | null = null;

    // Ford part number patterns and vehicle identification
    if (brand?.toLowerCase() === 'ford') {
      // Ford F-150 Lightning (Electric Truck) - NL3T prefix
      if (title.match(/NL3T-?15K601/i)) {
        vehicleModel = 'F-150 Lightning';
        additionalTerms.push('F-150', 'Lightning', 'Electric', 'Truck', '2022', '2023', '2024');
      }
      // Ford F-150 (Regular) - FL3T prefix
      else if (title.match(/FL3T-?15K601/i)) {
        vehicleModel = 'F-150';
        additionalTerms.push('F-150', 'Truck', '2021', '2022', '2023', '2024');
      }
      // Ford Mustang - DS7T prefix
      else if (title.match(/DS7T-?15K601/i)) {
        vehicleModel = 'Mustang';
        additionalTerms.push('Mustang', 'Sports Car', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023');
      }
      // Ford Explorer - BB5T prefix
      else if (title.match(/BB5T-?15K601/i)) {
        vehicleModel = 'Explorer';
        additionalTerms.push('Explorer', 'SUV', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019');
      }
      // Ford Escape - CJ5T prefix
      else if (title.match(/CJ5T-?15K601/i)) {
        vehicleModel = 'Escape';
        additionalTerms.push('Escape', 'SUV', 'Crossover', '2013', '2014', '2015', '2016', '2017', '2018', '2019');
      }
    }

    // GM/Chevrolet part number patterns
    else if (brand?.toLowerCase().includes('gm') || brand?.toLowerCase().includes('chevrolet')) {
      // Corvette - specific part number patterns
      if (title.match(/1364[0-9]/i)) {
        vehicleModel = 'Corvette';
        additionalTerms.push('Corvette', 'Sports Car', 'C7', 'C8');
      }
      // Camaro - specific patterns
      else if (title.match(/2323[0-9]/i)) {
        vehicleModel = 'Camaro';
        additionalTerms.push('Camaro', 'Sports Car', 'SS', 'ZL1');
      }
    }

    // BMW part number patterns
    else if (brand?.toLowerCase() === 'bmw') {
      // 3 Series - 6135 prefix
      if (title.match(/6135[0-9]/i)) {
        vehicleModel = '3 Series';
        additionalTerms.push('3 Series', 'Sedan', 'BMW');
      }
    }

    // Generic automotive keywords enhancement
    if (titleLower.includes('key fob') || titleLower.includes('remote') || titleLower.includes('keyless')) {
      additionalTerms.push('Key Fob', 'Remote Entry', 'Keyless Entry');
      
      // Add frequency-specific terms for key fobs
      if (title.match(/315\s?mhz/i)) {
        additionalTerms.push('315MHz');
      }
      if (title.match(/433\s?mhz/i)) {
        additionalTerms.push('433MHz');
      }
    }

    // Filter out terms that already exist (case-insensitive)
    const filteredTerms = additionalTerms.filter(term => 
      !existingTerms.some(existing => existing.toLowerCase() === term.toLowerCase())
    );

    console.log('🚗 [EbayService] Automotive enhancement:', {
      vehicleModel,
      additionalTerms: filteredTerms,
      originalTitle: title
    });

    return {
      vehicleModel,
      additionalTerms: filteredTerms
    };
  }
}