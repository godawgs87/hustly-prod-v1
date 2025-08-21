import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseStringPromise, Builder } from 'https://esm.sh/xml2js@0.6.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ListingData {
  title: string
  description: string
  price: number
  quantity: number
  condition: string
  ebay_category_id: string
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

  private async buildAddFixedPriceItemXML(listing: ListingData, sku: string): Promise<string> {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false }
    })

    // Get user location
    const { postalCode, location } = await this.getUserLocation()

    // Build the item object with required fields only
    const detectedCategory = this.detectEbayCategory(listing.title, listing.description);
    const finalCategory = detectedCategory || listing.ebay_category_id;
    console.log('[Trading API] Category detection:', {
      title: listing.title,
      detected: detectedCategory,
      fallback: listing.ebay_category_id,
      using: finalCategory
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
      SKU: sku,
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

    // Add photos if available - filter out any undefined/null values
    if (listing.photos && listing.photos.length > 0) {
      const validPhotos = listing.photos.filter(photo => photo && typeof photo === 'string').slice(0, 12)
      if (validPhotos.length > 0) {
        itemData.AddFixedPriceItemRequest.Item.PictureDetails = {
          PictureURL: validPhotos
        }
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

  async addFixedPriceItem(listingId: string): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      console.log('[Trading API] Sending AddFixedPriceItem request');
      
      // Get listing data from database
      const { data: listing, error: listingError } = await this.supabaseClient
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        throw new Error(`Failed to fetch listing: ${listingError?.message}`);
      }

      // Determine eBay category ID
      let ebayCategoryId = listing.ebay_category_id;
      
      if (!ebayCategoryId) {
        // Use smart category detection based on title and description
        ebayCategoryId = this.detectEbayCategory(listing.title, listing.description, listing.category);
        console.log('[Trading API] Auto-detected eBay category:', ebayCategoryId, 'for listing:', listing.title);
      }

      if (!ebayCategoryId) {
        throw new Error('Unable to determine eBay category. Please set a category for this listing.');
      }

      const sku = `HUSTLY-${listingId}`;
      
      // Build XML with the detected category
      const listingWithCategory = { ...listing, ebay_category_id: ebayCategoryId };
      const xmlPayload = await this.buildAddFixedPriceItemXML(listingWithCategory, sku);
      
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

  private detectEbayCategory(title: string, description: string = '', internalCategory: string = ''): string | null {
    const text = `${title} ${description} ${internalCategory}`.toLowerCase();
    
    // Home & Garden
    if (text.includes('vacuum') || text.includes('dyson') || text.includes('cleaner')) {
      return '20613'; // Vacuum Cleaners
    }
    if (text.includes('furniture') || text.includes('chair') || text.includes('table') || text.includes('sofa')) {
      return '3197'; // Furniture
    }
    if (text.includes('kitchen') || text.includes('appliance')) {
      return '20667'; // Kitchen Appliances
    }
    
    // Automotive categories - Using valid eBay Motors LEAF categories
    if (text.includes('key fob') || text.includes('key') && text.includes('fob') || 
        text.includes('proximity') || text.includes('smart key') || text.includes('keyless')) {
      return '33765'; // eBay Motors > Parts & Accessories > Car & Truck Parts > Interior > Switches & Controls > Remotes & Keyless Entry (LEAF)
    }
    if (text.includes('sensor') && (text.includes('ford') || text.includes('automotive') || text.includes('car'))) {
      return '33596'; // eBay Motors > Parts & Accessories > Car & Truck Parts > Sensors (LEAF)
    }
    if (text.includes('brake') && (text.includes('pad') || text.includes('rotor'))) {
      return '33564'; // eBay Motors > Parts & Accessories > Car & Truck Parts > Brakes & Brake Parts (LEAF)
    }
    if (text.includes('filter') && (text.includes('air') || text.includes('oil'))) {
      return '33598'; // eBay Motors > Parts & Accessories > Car & Truck Parts > Filters (LEAF)
    }
    if (text.includes('battery') && (text.includes('car') || text.includes('automotive'))) {
      return '33601'; // eBay Motors > Parts & Accessories > Car & Truck Parts > Batteries (LEAF)
    }
    // Generic automotive fallback - use a common leaf category
    if (text.includes('automotive') || text.includes('car') || text.includes('truck') || text.includes('vehicle')) {
      return '33765'; // Default to Remotes & Keyless Entry as a safe leaf category
    }
    
    // Electronics
    if (text.includes('phone') || text.includes('iphone') || text.includes('android')) {
      return '9355'; // Cell Phones & Smartphones
    }
    if (text.includes('laptop') || text.includes('computer') || text.includes('macbook')) {
      return '175672'; // Laptops & Netbooks
    }
    if (text.includes('electronic') || text.includes('digital') || text.includes('tech') || text.includes('device')) {
      return '293'; // Consumer Electronics
    }
    
    // Clothing & Fashion
    if (text.includes('shoe') || text.includes('sneaker') || text.includes('boot')) {
      return '93427'; // Shoes
    }
    if (text.includes('shirt') || text.includes('dress') || text.includes('pants') || text.includes('clothing')) {
      return '11450'; // Clothing, Shoes & Accessories
    }
    if (text.includes('bag') || text.includes('purse') || text.includes('handbag')) {
      return '169291'; // Women's Bags & Handbags
    }
    
    // Collectibles & Hobbies
    if (text.includes('card') && (text.includes('pokemon') || text.includes('trading') || text.includes('sports'))) {
      return '212'; // Trading Cards
    }
    if (text.includes('toy') || text.includes('lego') || text.includes('action figure')) {
      return '220'; // Toys & Hobbies
    }
    if (text.includes('collectible') || text.includes('vintage') || text.includes('antique')) {
      return '1'; // Collectibles
    }
    
    // Books & Media
    if (text.includes('book') || text.includes('novel') || text.includes('textbook')) {
      return '267'; // Books
    }
    if (text.includes('dvd') || text.includes('blu-ray') || text.includes('movie')) {
      return '617'; // DVDs & Blu-ray Discs
    }
    if (text.includes('game') || text.includes('playstation') || text.includes('xbox') || text.includes('nintendo')) {
      return '139973'; // Video Games
    }
    
    // Sports & Outdoors
    if (text.includes('golf') || text.includes('tennis') || text.includes('basketball') || text.includes('soccer')) {
      return '888'; // Sporting Goods
    }
    
    // Health & Beauty
    if (text.includes('makeup') || text.includes('cosmetic') || text.includes('perfume')) {
      return '26395'; // Health & Beauty
    }
    
    // Default fallback - Everything Else category (safer than 99)
    return '88433'; // Everything Else > Other
  }

  async reviseFixedPriceItem(itemId: string, listing: ListingData): Promise<any> {
    const token = await this.getAccessToken()
    const xmlPayload = this.buildReviseFixedPriceItemXML(itemId, listing)
    
    console.log('[Trading API] Sending ReviseFixedPriceItem request')
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getTradingAPIHeaders('ReviseFixedPriceItem', token),
      body: xmlPayload
    })

    const responseText = await response.text()
    const result = await parseStringPromise(responseText)
    
    if (result.ReviseFixedPriceItemResponse?.Errors) {
      const errors = Array.isArray(result.ReviseFixedPriceItemResponse.Errors)
        ? result.ReviseFixedPriceItemResponse.Errors
        : [result.ReviseFixedPriceItemResponse.Errors]
      
      const severeErrors = errors.filter((e: any) => 
        e.SeverityCode && e.SeverityCode[0] === 'Error'
      )
      
      if (severeErrors.length > 0) {
        throw new Error(`eBay Trading API Error: ${JSON.stringify(severeErrors)}`)
      }
    }

    return {
      success: true,
      itemId: itemId
    }
  }

  async endFixedPriceItem(itemId: string, reason: string = 'NotAvailable'): Promise<any> {
    const token = await this.getAccessToken()
    
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false }
    })

    const xmlPayload = builder.buildObject({
      EndFixedPriceItemRequest: {
        $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        ItemID: itemId,
        EndingReason: reason
      }
    })
    
    console.log('[Trading API] Sending EndFixedPriceItem request')
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getTradingAPIHeaders('EndFixedPriceItem', token),
      body: xmlPayload
    })

    const responseText = await response.text()
    const result = await parseStringPromise(responseText)
    
    if (result.EndFixedPriceItemResponse?.Errors) {
      const errors = Array.isArray(result.EndFixedPriceItemResponse.Errors)
        ? result.EndFixedPriceItemResponse.Errors
        : [result.EndFixedPriceItemResponse.Errors]
      
      const severeErrors = errors.filter((e: any) => 
        e.SeverityCode && e.SeverityCode[0] === 'Error'
      )
      
      if (severeErrors.length > 0) {
        throw new Error(`eBay Trading API Error: ${JSON.stringify(severeErrors)}`)
      }
    }

    return {
      success: true,
      endTime: result.EndFixedPriceItemResponse?.EndTime?.[0]
    }
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, listingId, userId, itemId, reason, listingData } = await req.json()
    
    console.log(`[Trading API] Action: ${action}`, { listingId, userId, itemId })

    // Get user ID from listing if not provided
    let effectiveUserId = userId
    if (!effectiveUserId && listingId) {
      const { data: listing } = await supabaseClient
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single()
      
      if (listing) {
        effectiveUserId = listing.user_id
      }
    }

    if (!effectiveUserId) {
      throw new Error('User ID not provided and could not be determined from listing')
    }

    const api = new EbayTradingAPI(false, supabaseClient, effectiveUserId)

    switch (action) {
      case 'create_listing': {
        // Fetch listing data if not provided
        let listing = listingData
        if (!listing && listingId) {
          const { data } = await supabaseClient
            .from('listings')
            .select('*, listing_photos(*)')
            .eq('id', listingId)
            .single()
          
          if (!data) {
            throw new Error('Listing not found')
          }
          
          listing = {
            title: data.title,
            description: data.description,
            price: data.price,
            quantity: data.quantity || 1,
            condition: data.condition,
            ebay_category_id: data.ebay_category_id,
            photos: data.listing_photos?.map((p: any) => p.photo_url) || [],
            brand: data.brand,
            mpn: data.mpn,
            upc: data.upc,
            ean: data.ean,
            isbn: data.isbn,
            shipping_cost: data.shipping_cost,
            shipping_service: data.shipping_service,
            handling_time: data.handling_time,
            return_accepted: data.return_accepted,
            return_period: data.return_period
          }
        }

        const sku = `HUSTLY-${listingId || Date.now()}`
        const result = await api.addFixedPriceItem(listingId)
        
        // Update listing with eBay item ID
        if (listingId && result.itemId) {
          await supabaseClient
            .from('listings')
            .update({ 
              ebay_item_id: result.itemId,
              ebay_listing_status: 'active',
              ebay_last_sync: new Date().toISOString()
            })
            .eq('id', listingId)
        }
        
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_listing': {
        if (!itemId) {
          throw new Error('Item ID required for update')
        }
        
        const result = await api.reviseFixedPriceItem(itemId, listingData)
        
        // Update sync timestamp
        if (listingId) {
          await supabaseClient
            .from('listings')
            .update({ 
              ebay_last_sync: new Date().toISOString()
            })
            .eq('id', listingId)
        }
        
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'end_listing': {
        if (!itemId) {
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
