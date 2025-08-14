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
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
      body: { 
        listingId, 
        userId: user.id,
        ...options 
      }
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

  // ==================== NEW CRUD OPERATIONS ====================
  
  // Import eBay inventory into Hustly
  static async importInventory(options: { limit?: number; page?: number } = {}) {
    console.log('📥 [EbayService] Importing eBay inventory');
    const { data, error } = await supabase.functions.invoke('ebay-inventory-import', {
      body: { 
        action: 'get_active_listings',
        limit: options.limit || 100,
        page: options.page || 1
      }
    });

    if (error) {
      throw new Error(`Import failed: ${error.message}`);
    }

    return data;
  }

  static async importToHustly(listings: any[]) {
    console.log(`📥 [EbayService] Importing ${listings?.length || 0} listings to Hustly`);
    const { data, error } = await supabase.functions.invoke('ebay-inventory-import', {
      body: { 
        action: 'import_to_hustly',
        listings
      }
    });

    if (error) {
      throw new Error(`Import failed: ${error.message}`);
    }

    return data;
  }

  static async syncAllInventory() {
    console.log('🔄 [EbayService] Syncing all eBay inventory');
    const { data, error } = await supabase.functions.invoke('ebay-inventory-import', {
      body: { action: 'sync_all' }
    });

    if (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }

    return data;
  }

  // Update an existing eBay listing
  static async updateListing(listingId: string, updates: any) {
    console.log('📝 [EbayService] Updating listing:', listingId);
    const { data, error } = await supabase.functions.invoke('ebay-crud-operations', {
      body: { 
        action: 'update_listing',
        listingId,
        updates
      }
    });

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    return data;
  }

  // End/Delete an eBay listing
  static async endListing(listingId: string, reason: string = 'NotAvailable') {
    console.log('🗑️ [EbayService] Ending listing:', listingId);
    const { data, error } = await supabase.functions.invoke('ebay-crud-operations', {
      body: { 
        action: 'end_listing',
        listingId,
        reason
      }
    });

    if (error) {
      throw new Error(`End listing failed: ${error.message}`);
    }

    return data;
  }

  // Get listing status from eBay
  static async getListingStatus(listingId: string) {
    console.log('🔍 [EbayService] Getting listing status:', listingId);
    const { data, error } = await supabase.functions.invoke('ebay-crud-operations', {
      body: { 
        action: 'get_listing_status',
        listingId
      }
    });

    if (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }

    return data;
  }

  // Bulk status check for multiple listings
  static async bulkStatusCheck(listingIds: string[]) {
    console.log(`🔍 [EbayService] Checking status for ${listingIds.length} listings`);
    const { data, error } = await supabase.functions.invoke('ebay-crud-operations', {
      body: { 
        action: 'bulk_status_check',
        listingIds
      }
    });

    if (error) {
      throw new Error(`Bulk status check failed: ${error.message}`);
    }

    return data;
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

  // NEW: Smart title enhancement based on eBay comparables
  static enhanceTitleFromComparables(originalTitle: string, comparables: any[]): {
    enhancedTitle: string;
    enhancedDescription: string;
    extractedInfo: any;
  } {
    if (!comparables || comparables.length === 0) {
      return {
        enhancedTitle: originalTitle,
        enhancedDescription: '',
        extractedInfo: {}
      };
    }

    console.log('🔍 [EbayService] Analyzing comparables for title enhancement:', comparables.length);

    // Extract information from top 10 comparable titles
    const topComparables = comparables.slice(0, 10);
    const titleAnalysis = {
      yearRanges: new Set<string>(),
      vehicleModels: new Set<string>(),
      partTypes: new Set<string>(),
      features: new Set<string>(),
      brands: new Set<string>()
    };

    topComparables.forEach(comp => {
      const title = comp.title?.toLowerCase() || '';
      
      // Extract year ranges (2022-2025, 2018-2021, etc.)
      const yearRange = title.match(/20\d{2}[-–]20\d{2}/);
      if (yearRange) titleAnalysis.yearRanges.add(yearRange[0]);

      // Extract single years (2022, 2023, etc.)
      const singleYears = title.match(/20\d{2}/g);
      if (singleYears && singleYears.length >= 2) {
        const sortedYears = singleYears.sort();
        if (sortedYears.length >= 2) {
          titleAnalysis.yearRanges.add(`${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}`);
        }
      }

      // Extract vehicle models (F-150 Lightning, Mustang, 3 Series, etc.)
      const vehiclePatterns = [
        /f-?150\s+lightning/i,
        /f-?150/i,
        /mustang/i,
        /explorer/i,
        /escape/i,
        /corvette/i,
        /camaro/i,
        /3\s+series/i,
        /c-?class/i,
        /e-?class/i,
        /camry/i,
        /accord/i,
        /altima/i
      ];

      vehiclePatterns.forEach(pattern => {
        const match = title.match(pattern);
        if (match) {
          titleAnalysis.vehicleModels.add(match[0].replace(/[-\s]+/g, ' ').trim());
        }
      });

      // Extract part types
      const partPatterns = [
        /smart\s+key\s+fob/i,
        /key\s+fob/i,
        /keyless\s+entry/i,
        /remote/i,
        /proximity/i,
        /smart\s+key/i
      ];

      partPatterns.forEach(pattern => {
        const match = title.match(pattern);
        if (match) {
          titleAnalysis.partTypes.add(match[0].replace(/\s+/g, ' ').trim());
        }
      });

      // Extract features
      const featurePatterns = [
        /oem/i,
        /genuine/i,
        /original/i,
        /proximity/i,
        /smart/i,
        /keyless/i,
        /315mhz/i,
        /433mhz/i
      ];

      featurePatterns.forEach(pattern => {
        const match = title.match(pattern);
        if (match) {
          titleAnalysis.features.add(match[0].toUpperCase());
        }
      });
    });

    // Build enhanced title from most common elements
    const mostCommonYearRange = Array.from(titleAnalysis.yearRanges)[0];
    const mostCommonVehicle = Array.from(titleAnalysis.vehicleModels)[0];
    const mostCommonPartType = Array.from(titleAnalysis.partTypes)[0];
    const topFeatures = Array.from(titleAnalysis.features).slice(0, 2);

    // Extract part number from original title
    const partNumber = originalTitle.match(/[A-Z0-9]{2,4}-[A-Z0-9]{5,}[A-Z0-9]*/i)?.[0];
    const brand = originalTitle.match(/(Ford|GM|BMW|Mercedes|Toyota|Honda|Nissan)/i)?.[0];

    // Build enhanced title
    let enhancedTitle = originalTitle;
    if (mostCommonVehicle && brand) {
      const titleParts = [
        topFeatures.includes('OEM') ? 'OEM' : '',
        mostCommonYearRange,
        brand,
        mostCommonVehicle,
        mostCommonPartType || 'Key Fob',
        partNumber
      ].filter(Boolean);

      enhancedTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();
      
      // Ensure title stays under 80 characters for eBay
      if (enhancedTitle.length > 80) {
        enhancedTitle = titleParts.slice(0, -1).join(' ').replace(/\s+/g, ' ').trim();
      }
    }

    // Build enhanced description
    let enhancedDescription = '';
    if (mostCommonVehicle && brand) {
      enhancedDescription = `This ${topFeatures.includes('OEM') ? 'OEM' : 'genuine'} ${brand} ${mostCommonPartType || 'key fob'} is specifically designed for ${mostCommonYearRange ? mostCommonYearRange + ' ' : ''}${brand} ${mostCommonVehicle} vehicles. ${partNumber ? `Part number ${partNumber}. ` : ''}Features ${topFeatures.filter(f => f !== 'OEM').join(', ').toLowerCase()} functionality for reliable performance and seamless integration with your vehicle's security system.`;
    }

    const extractedInfo = {
      yearRange: mostCommonYearRange,
      vehicleModel: mostCommonVehicle,
      partType: mostCommonPartType,
      features: Array.from(titleAnalysis.features),
      partNumber,
      brand
    };

    console.log('✨ [EbayService] Title enhancement complete:', {
      original: originalTitle,
      enhanced: enhancedTitle,
      extracted: extractedInfo
    });

    return {
      enhancedTitle,
      enhancedDescription,
      extractedInfo
    };
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