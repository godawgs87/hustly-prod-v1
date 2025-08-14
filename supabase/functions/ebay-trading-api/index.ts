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

  private buildAddFixedPriceItemXML(listing: ListingData, sku: string): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false }
    })

    const itemData: any = {
      AddFixedPriceItemRequest: {
        $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
        ErrorLanguage: 'en_US',
        WarningLevel: 'High',
        Item: {
          Title: listing.title,
          Description: listing.description,
          PrimaryCategory: {
            CategoryID: listing.ebay_category_id
          },
          StartPrice: listing.price.toString(),
          CategoryMappingAllowed: 'true',
          Country: 'US',
          Currency: 'USD',
          DispatchTimeMax: listing.handling_time || 3,
          ListingDuration: 'GTC',
          ListingType: 'FixedPriceItem',
          Quantity: listing.quantity.toString(),
          ConditionID: this.mapConditionToID(listing.condition),
          SKU: sku,
          // Inline payment details (no policy required)
          PaymentMethods: ['PayPal', 'CreditCard'],
          PayPalEmailAddress: 'paypal@hustly.com', // Will be replaced with user's PayPal
          // Inline shipping details (no policy required)
          ShippingDetails: {
            ShippingType: 'Flat',
            ShippingServiceOptions: {
              ShippingServicePriority: '1',
              ShippingService: listing.shipping_service || 'USPSPriority',
              ShippingServiceCost: (listing.shipping_cost || 0).toString(),
              ShippingServiceAdditionalCost: '0.00'
            }
          },
          // Inline return details (no policy required)
          ReturnPolicy: {
            ReturnsAcceptedOption: listing.return_accepted ? 'ReturnsAccepted' : 'ReturnsNotAccepted',
            RefundOption: 'MoneyBack',
            ReturnsWithinOption: `Days_${listing.return_period || 30}`,
            ShippingCostPaidByOption: 'Buyer'
          }
        }
      }
    }

    // Add photos if available
    if (listing.photos && listing.photos.length > 0) {
      itemData.AddFixedPriceItemRequest.Item.PictureDetails = {
        PictureURL: listing.photos.slice(0, 12) // eBay allows max 12 photos
      }
    }

    // Add product identifiers if available
    const productListingDetails: any = {}
    if (listing.brand) productListingDetails.BrandMPN = { Brand: listing.brand }
    if (listing.mpn) productListingDetails.BrandMPN = { ...productListingDetails.BrandMPN, MPN: listing.mpn }
    if (listing.upc) productListingDetails.UPC = listing.upc
    if (listing.ean) productListingDetails.EAN = listing.ean
    if (listing.isbn) productListingDetails.ISBN = listing.isbn
    
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

  async addFixedPriceItem(listing: ListingData, sku: string): Promise<any> {
    const token = await this.getAccessToken()
    const xmlPayload = this.buildAddFixedPriceItemXML(listing, sku)
    
    console.log('[Trading API] Sending AddFixedPriceItem request')
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getTradingAPIHeaders('AddFixedPriceItem', token),
      body: xmlPayload
    })

    const responseText = await response.text()
    const result = await parseStringPromise(responseText)
    
    if (result.AddFixedPriceItemResponse?.Errors) {
      const errors = Array.isArray(result.AddFixedPriceItemResponse.Errors)
        ? result.AddFixedPriceItemResponse.Errors
        : [result.AddFixedPriceItemResponse.Errors]
      
      const severeErrors = errors.filter((e: any) => 
        e.SeverityCode && e.SeverityCode[0] === 'Error'
      )
      
      if (severeErrors.length > 0) {
        throw new Error(`eBay Trading API Error: ${JSON.stringify(severeErrors)}`)
      }
    }

    if (result.AddFixedPriceItemResponse?.ItemID) {
      return {
        success: true,
        itemId: result.AddFixedPriceItemResponse.ItemID[0],
        fees: result.AddFixedPriceItemResponse.Fees
      }
    }

    throw new Error('Unexpected response from eBay Trading API')
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
        const result = await api.addFixedPriceItem(listing, sku)
        
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
