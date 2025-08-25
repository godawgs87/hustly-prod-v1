import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseStringPromise, Builder } from 'https://esm.sh/xml2js@0.6.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ListingData {
  id?: string
  title: string
  description: string
  price: number
  quantity: number
  condition: string
  ebay_category_id?: string
  photos?: string[]
  brand?: string
  mpn?: string
  upc?: string
  ean?: string
  isbn?: string
  shipping_cost?: number
  shipping_service?: string
  handling_time?: number
  return_accepted?: boolean
  return_period?: number
  payment_methods?: string[]
  platform_categories?: any
}

class EbayTradingAPI {
  private baseUrl: string
  private supabaseClient: any
  private userId: string
  private appId: string
  private devId: string
  private certId: string

  constructor(isSandbox = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'
    this.supabaseClient = supabaseClient
    this.userId = userId
    
    // eBay app credentials from environment
    this.appId = Deno.env.get('EBAY_APP_ID') || ''
    this.devId = Deno.env.get('EBAY_DEV_ID') || ''
    this.certId = Deno.env.get('EBAY_CERT_ID') || ''
  }

  private async getUserBusinessType(): Promise<string> {
    const { data: profile } = await this.supabaseClient
      .from('user_profiles')
      .select('business_type')
      .eq('user_id', this.userId)
      .single()
    
    return profile?.business_type || 'individual'
  }

  private async getUserLocation(): Promise<{ postalCode: string; location: string }> {
    const { data: profile } = await this.supabaseClient
      .from('user_profiles')
      .select('zip_code, city, state')
      .eq('user_id', this.userId)
      .single()
    
    // Use user's zip code if available, otherwise default to a common US zip
    const postalCode = profile?.zip_code || '10001'
    const location = (profile?.city && profile?.state) 
      ? `${profile.city}, ${profile.state}` 
      : 'United States'
    
    return { postalCode, location }
  }

  private async getAccessToken(): Promise<string> {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('oauth_token')
      .eq('user_id', this.userId)
      .eq('platform', 'ebay')
      .single()

    if (error || !account) {
      throw new Error('No eBay account found')
    }

    return account.oauth_token
  }

  private getTradingAPIHeaders(callName: string, token: string): Headers {
    const headers = new Headers()
    headers.set('X-EBAY-API-SITEID', '0') // US site
    headers.set('X-EBAY-API-COMPATIBILITY-LEVEL', '1157')
    headers.set('X-EBAY-API-CALL-NAME', callName)
    headers.set('X-EBAY-API-IAF-TOKEN', token)
    headers.set('Content-Type', 'text/xml')
    return headers
  }

  private async buildAddFixedPriceItemXML(listing: ListingData): Promise<string> {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false }
    })

    // Get user location
    const { postalCode, location } = await this.getUserLocation()

    // Build the item object with required fields only
    const finalCategory = await this.validateAndGetLeafCategory(listing);
    
    console.log('[Trading API] Category resolution:', {
      title: listing.title,
      apiProvided: listing.ebay_category_id,
      finalCategory
    });
    
    const item: any = {
      Title: listing.title,
      Description: listing.description,
      PrimaryCategory: {
        CategoryID: finalCategory
      },
      StartPrice: listing.price.toString(),
      CategoryMappingAllowed: 'true',
      Country: 'US',
      Currency: 'USD',
      DispatchTimeMax: (listing.handling_time || 3).toString(),
      ListingDuration: 'GTC',
      ListingType: 'FixedPriceItem',
      Quantity: listing.quantity.toString(),
      ConditionID: this.mapConditionToID(listing.condition),
      Location: location,
      PostalCode: postalCode
    }

    // Add shipping details - always required
    item.ShippingDetails = {
      ShippingType: 'Flat',
      ShippingServiceOptions: {
        ShippingServicePriority: '1',
        ShippingService: listing.shipping_service || 'USPSPriority',
        ShippingServiceCost: (listing.shipping_cost || 0).toString(),
        ShippingServiceAdditionalCost: '0.00'
      }
    }

    // Build return policy object carefully to avoid undefined fields
    const returnPolicy: any = {}
    if (listing.return_accepted === true) {
      returnPolicy.ReturnsAcceptedOption = 'ReturnsAccepted'
      returnPolicy.RefundOption = 'MoneyBack'
      returnPolicy.ReturnsWithinOption = listing.return_period ? `Days_${listing.return_period}` : 'Days_30'
      returnPolicy.ShippingCostPaidByOption = 'Buyer'
      returnPolicy.Description = 'Returns accepted within 30 days. Buyer pays return shipping.'
    } else {
      returnPolicy.ReturnsAcceptedOption = 'ReturnsNotAccepted'
    }
    item.ReturnPolicy = returnPolicy

    const itemData: any = {
      AddFixedPriceItemRequest: {
        $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: item
      }
    }

    // Add photos if available - filter out any undefined/null values and data URIs
    if (listing.photos && listing.photos.length > 0) {
      const validPhotos = listing.photos
        .filter(photo => {
          if (!photo || typeof photo !== 'string') return false
          // Skip data URIs (base64 encoded images) as eBay doesn't accept them
          if (photo.startsWith('data:')) return false
          // Skip URLs with semicolons as eBay doesn't accept them
          if (photo.includes(';')) return false
          return true
        })
        .slice(0, 12)
      
      if (validPhotos.length > 0) {
        itemData.AddFixedPriceItemRequest.Item.PictureDetails = {
          PictureURL: validPhotos
        }
      } else {
        console.log('[Trading API] Warning: No valid photo URLs for eBay. Photos may be data URIs or contain semicolons.')
      }
    }

    // Add product identifiers if available - only include defined values
    const productListingDetails: any = {}
    
    // Handle BrandMPN carefully
    if (listing.brand || listing.mpn) {
      productListingDetails.BrandMPN = {}
      if (listing.brand && listing.brand.trim()) {
        productListingDetails.BrandMPN.Brand = listing.brand.trim()
      }
      if (listing.mpn && listing.mpn.trim()) {
        productListingDetails.BrandMPN.MPN = listing.mpn.trim()
      }
      // Only keep BrandMPN if it has at least one field
      if (Object.keys(productListingDetails.BrandMPN).length === 0) {
        delete productListingDetails.BrandMPN
      }
    }
    
    // Add other identifiers only if they have values
    if (listing.upc && listing.upc.trim()) productListingDetails.UPC = listing.upc.trim()
    if (listing.ean && listing.ean.trim()) productListingDetails.EAN = listing.ean.trim()
    if (listing.isbn && listing.isbn.trim()) productListingDetails.ISBN = listing.isbn.trim()
    
    if (Object.keys(productListingDetails).length > 0) {
      itemData.AddFixedPriceItemRequest.Item.ProductListingDetails = productListingDetails
    }

    return builder.buildObject(itemData)
  }

  private buildReviseFixedPriceItemXML(itemId: string, listing: ListingData): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false }
    })

    const itemData: any = {
      ReviseFixedPriceItemRequest: {
        $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: {
          ItemID: itemId,
          Title: listing.title,
          Description: listing.description,
          StartPrice: listing.price.toString(),
          Quantity: listing.quantity.toString()
        }
      }
    }

    // Add photos if changed
    if (listing.photos && listing.photos.length > 0) {
      itemData.ReviseFixedPriceItemRequest.Item.PictureDetails = {
        PictureURL: listing.photos.slice(0, 12)
      }
    }

    return builder.buildObject(itemData)
  }

  private mapConditionToID(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'new': '1000',
      'new_with_tags': '1000',
      'new_without_tags': '1500',
      'like_new': '1500',
      'very_good': '2000',
      'good': '3000',
      'acceptable': '4000',
      'for_parts': '7000'
    }
    return conditionMap[condition.toLowerCase()] || '3000'
  }

  async addFixedPriceItem(listingData: any): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      console.log('[Trading API] Sending AddFixedPriceItem request');
      
      // Use provided listing data or fetch from database
      let listing = listingData;
      
      // If listingData is a string (listingId), fetch from database
      if (typeof listingData === 'string') {
        const { data, error: listingError } = await this.supabaseClient
          .from('listings')
          .select('*, listing_photos(*)')
          .eq('id', listingData)
          .single();

        if (listingError || !data) {
          throw new Error(`Failed to fetch listing: ${listingError?.message}`);
        }
        
        listing = {
          id: data.id,
          title: data.title,
          description: data.description,
          price: data.price,
          quantity: data.quantity || 1,
          condition: data.condition || 'good',
          ebay_category_id: data.ebay_category_id,
          photos: data.listing_photos?.map((p: any) => p.photo_url) || [],
          brand: data.brand,
          mpn: data.mpn,
          upc: data.upc,
          ean: data.ean,
          isbn: data.isbn,
          shipping_cost: data.shipping_cost || 0,
          shipping_service: data.shipping_service || 'USPSPriority',
          handling_time: data.handling_time || 3,
          return_accepted: data.return_accepted !== false,
          return_period: data.return_period || 30,
          platform_categories: data.platform_categories
        };
      }

      // Ensure we have required fields
      if (!listing.title || !listing.description || !listing.price) {
        throw new Error('Missing required listing fields: title, description, or price');
      }

      // Use photos from listing object
      const photoUrls = listing.photos || [];

      // Filter out data URIs and invalid URLs
      const validPhotoUrls = photoUrls.filter((url: string) => {
        if (!url) return false;
        // Skip data URIs
        if (url.startsWith('data:')) return false;
        // Skip URLs with semicolons (often indicates data URI or malformed URL)
        if (url.includes(';')) return false;
        // Must be http or https
        return url.startsWith('http://') || url.startsWith('https://');
      });

      if (validPhotoUrls.length === 0) {
        console.warn('[Trading API] Warning: No valid photo URLs for eBay. Photos may be data URIs or contain semicolons.');
      }

      const sku = `HUSTLY-${listing.id || Date.now()}`;
      
      // Build XML payload
      const xmlPayload = await this.buildAddFixedPriceItemXML(listing);
      
      // Get access token and make the Trading API request
      const token = await this.getAccessToken();
      
      console.log('[Trading API] Sending request to eBay Trading API');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getTradingAPIHeaders('AddFixedPriceItem', token),
        body: xmlPayload
      });

      const responseText = await response.text();
      const result = await parseStringPromise(responseText);
      
      // Check for errors in the response
      if (result.AddFixedPriceItemResponse?.Errors) {
        const errors = Array.isArray(result.AddFixedPriceItemResponse.Errors)
          ? result.AddFixedPriceItemResponse.Errors
          : [result.AddFixedPriceItemResponse.Errors];
        
        const severeErrors = errors.filter((e: any) => 
          e.SeverityCode && e.SeverityCode[0] === 'Error'
        );
        
        if (severeErrors.length > 0) {
          throw new Error(`eBay Trading API Error: ${JSON.stringify(severeErrors)}`);
        }
      }

      // Check for successful response with ItemID
      if (result.AddFixedPriceItemResponse?.ItemID) {
        const itemId = result.AddFixedPriceItemResponse.ItemID[0];
        
        // Update listing with eBay item ID and detected category
        await this.supabaseClient
          .from('listings')
          .update({ 
            ebay_item_id: itemId,
            ebay_category_id: ebayCategoryId
          })
          .eq('id', listingId);

        return {
          success: true,
          itemId: itemId
        };
      } else {
        throw new Error('Unexpected response from eBay Trading API - no ItemID returned');
      }
    } catch (error: any) {
      console.error('[Trading API] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async getEbayCategorySuggestions(query: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      
      // First get the default category tree ID for the marketplace
      const marketplaceId = 'EBAY_US';
      const treeResponse = await fetch(
        `https://api.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        }
      );
      
      if (!treeResponse.ok) {
        console.error('[Trading API] Failed to get category tree ID:', await treeResponse.text());
        return null;
      }
      
      const treeData = await treeResponse.json();
      const categoryTreeId = treeData.categoryTreeId;
      
      // Now get category suggestions based on the item title/description
      const suggestResponse = await fetch(
        `https://api.ebay.com/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        }
      );
      
      if (!suggestResponse.ok) {
        console.error('[Trading API] Failed to get category suggestions:', await suggestResponse.text());
        return null;
      }
      
      const suggestions = await suggestResponse.json();
      
      // Return the first suggested leaf category
      if (suggestions.categorySuggestions && suggestions.categorySuggestions.length > 0) {
        const leafCategory = suggestions.categorySuggestions[0].category.categoryId;
        console.log(`[Trading API] Taxonomy API suggested category ${leafCategory} for query: ${query}`);
        return leafCategory;
      }
      
      console.log('[Trading API] No category suggestions found for query:', query);
      return null;
    } catch (error) {
      console.error('[Trading API] Error getting category suggestions:', error);
      return null;
    }
  }

  private async validateAndGetLeafCategory(listing: any): Promise<string> {
    // First check if we have a pre-resolved category from platform_categories
    if (listing.platform_categories?.ebay?.category_id && listing.platform_categories?.ebay?.is_leaf) {
      console.log('[Trading API] Using pre-resolved eBay category:', listing.platform_categories.ebay.category_id);
      return listing.platform_categories.ebay.category_id;
    }

    // Try to use the provided category ID if valid
    const categoryId = listing.ebay_category_id || listing.category_id || listing.platform_categories?.ebay?.category_id;
    if (categoryId && categoryId.match(/^\d{4,6}$/)) {
      const isLeaf = await this.checkIfLeafCategory(categoryId);
      if (isLeaf) {
        console.log(`[Trading API] Confirmed ${categoryId} is a leaf category`);
        return categoryId;
      }
      console.log(`[Trading API] Category ${categoryId} is not a leaf category, finding alternatives`);
      
      // Try to get child leaf categories
      const leafCategory = await this.getLeafCategoryFromParent(categoryId);
      if (leafCategory) {
}

listing = {
  id: data.id,
  title: data.title,
  description: data.description,
  price: data.price,
  quantity: data.quantity || 1,
  condition: data.condition || 'good',
  ebay_category_id: data.ebay_category_id,
  photos: data.listing_photos?.map((p: any) => p.photo_url) || [],
  brand: data.brand,
  mpn: data.mpn,
  upc: data.upc,
  ean: data.ean,
  isbn: data.isbn,
  shipping_cost: data.shipping_cost || 0,
  shipping_service: data.shipping_service || 'USPSPriority',
  handling_time: data.handling_time || 3,
  return_accepted: data.return_accepted !== false,
  return_period: data.return_period || 30,
  platform_categories: data.platform_categories
};

// Ensure we have required fields
if (!listing.title || !listing.description || !listing.price) {
  throw new Error('Missing required listing fields: title, description, or price');
}

// Use photos from listing object
const photoUrls = listing.photos || [];

// Filter out data URIs and invalid URLs
const validPhotoUrls = photoUrls.filter((url: string) => {
  if (!url) return false;
  // Skip data URIs
  if (url.startsWith('data:')) return false;
  // Skip URLs with semicolons (often indicates data URI or malformed URL)
  if (url.includes(';')) return false;
  // Must be http or https
  return url.startsWith('http://') || url.startsWith('https://');
});

if (validPhotoUrls.length === 0) {
  console.warn('[Trading API] Warning: No valid photo URLs for eBay. Photos may be data URIs or contain semicolons.');
}

const sku = `HUSTLY-${listing.id || Date.now()}`;

// Build XML payload
const xmlPayload = await this.buildAddFixedPriceItemXML(listing);

// Get access token and make the Trading API request
const token = await this.getAccessToken();

console.log('[Trading API] Sending request to eBay Trading API');
const response = await fetch(this.baseUrl, {
  method: 'POST',
  headers: this.getTradingAPIHeaders('AddFixedPriceItem', token),
  body: xmlPayload
});

const responseText = await response.text();
const result = await parseStringPromise(responseText);

// Check for errors in the response
if (result.AddFixedPriceItemResponse?.Errors) {
  const errors = Array.isArray(result.AddFixedPriceItemResponse.Errors)
    ? result.AddFixedPriceItemResponse.Errors
    : [result.AddFixedPriceItemResponse.Errors];

  const severeErrors = errors.filter((e: any) =>
    e.SeverityCode && e.SeverityCode[0] === 'Error'
  );

  if (severeErrors.length > 0) {
    throw new Error(`eBay Trading API Error: ${JSON.stringify(severeErrors)}`);
  }
}

// Check for successful response with ItemID
if (result.AddFixedPriceItemResponse?.ItemID) {
  const itemId = result.AddFixedPriceItemResponse.ItemID[0];

  // Update listing with eBay item ID and detected category
  await this.supabaseClient
    .from('listings')
    .update({
      ebay_item_id: itemId,
      ebay_category_id: ebayCategoryId
    })
    .eq('id', listingId);

  return {
    success: true,
    itemId: itemId
  };
} else {
  throw new Error('Unexpected response from eBay Trading API - no ItemID returned');
}

// ... (rest of the code remains the same)

// ...

private async validateAndGetLeafCategory(listing: any): Promise<string> {
  // First check if we have a pre-resolved category from platform_categories
  if (listing.platform_categories?.ebay?.category_id && listing.platform_categories?.ebay?.is_leaf) {
    console.log('[Trading API] Using pre-resolved eBay category:', listing.platform_categories.ebay.category_id);
    return listing.platform_categories.ebay.category_id;
  }

  // Try to use the provided category ID if valid
  const categoryId = listing.ebay_category_id || listing.category_id || listing.platform_categories?.ebay?.category_id;
  if (categoryId && categoryId.match(/^\d{4,6}$/)) {
    const isLeaf = await this.checkIfLeafCategory(categoryId);
    if (isLeaf) {
      console.log(`[Trading API] Confirmed ${categoryId} is a leaf category`);
      return categoryId;
    }
    console.log(`[Trading API] Category ${categoryId} is not a leaf category, finding alternatives`);

    // Try to get child leaf categories
    const leafCategory = await this.getLeafCategoryFromParent(categoryId);
    if (leafCategory) {
      console.log(`[Trading API] Found leaf category ${leafCategory} under parent ${categoryId}`);
      return leafCategory;
    }
  }

  // Try to get a proper category from eBay's Taxonomy API
  const title = listing.title || '';
  const description = listing.description || '';
  const query = `${title} ${description}`.substring(0, 200).trim();
  const suggestedCategory = await this.getEbayCategorySuggestions(query);

  if (suggestedCategory) {
    // Verify it's a leaf category
    const isLeaf = await this.checkIfLeafCategory(suggestedCategory);
    if (isLeaf) {
      console.log(`[Trading API] Using Taxonomy API suggested leaf category ${suggestedCategory}`);
      return suggestedCategory;
    }
    // If suggested category is not a leaf, try to get its leaf children
    const leafCategory = await this.getLeafCategoryFromParent(suggestedCategory);
    if (leafCategory) {
      console.log(`[Trading API] Found leaf category ${leafCategory} from suggested parent ${suggestedCategory}`);
      return leafCategory;
    }
  }

  // Last resort: Use GetSuggestedCategories API
  const fallbackCategory = await this.getSuggestedCategoryForItem(title);
  if (fallbackCategory) {
    console.log(`[Trading API] Using GetSuggestedCategories result: ${fallbackCategory}`);
    return fallbackCategory;
  }

  // Ultimate fallback - use a generic category that we know is a leaf
  console.warn(`[Trading API] All category resolution failed, using generic fallback`);
  return '1249'; // Everything Else > Other - a universal leaf category
}

// ... (rest of the code remains the same)

async addFixedPriceItem(listing: ListingData): Promise<any> {
  try {
    const ebayCategoryId = await this.validateAndGetLeafCategory(listing);

    const apiProvidedCategory = listing.ebay_category_id;

    // ... (rest of the code remains the same)

    const sku = `HUSTLY-${listingId || Date.now()}`;
    const result = await api.addFixedPriceItem(listing);

    // Update listing with eBay item ID if we have a listing ID
    if (listing.id && result.itemId) {
      await this.supabaseClient
        .from('listings')
        .update({
          ebay_item_id: result.itemId,
          ebay_listing_status: 'active',
          ebay_last_sync: new Date().toISOString()
        })
        .eq('id', listing.id);
    }

    return { success: true, itemId: result.itemId };
          throw new Error('Item ID required to end listing')
        }
        
        const result = await api.endFixedPriceItem(itemId, reason || 'NotAvailable')
        
        // Update listing status
        if (listingId) {
          await supabaseClient
            .from('listings')
            .update({ 
              ebay_listing_status: 'ended',
              ebay_last_sync: new Date().toISOString()
            })
            .eq('id', listingId)
        }
        
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('[Trading API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
