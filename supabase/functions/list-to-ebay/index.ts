
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { listing, accountInfo } = await req.json()
    console.log('🔄 Starting eBay listing creation for:', listing.id)
    
    if (!accountInfo?.oauth_token) {
      throw new Error('No eBay OAuth token found. Please reconnect your eBay account.')
    }

    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID')
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET')
    
    if (!ebayClientId || !ebayClientSecret) {
      throw new Error('eBay API credentials not configured')
    }

    // Use the stored OAuth token
    const accessToken = accountInfo.oauth_token
    console.log('📡 Using stored OAuth token for eBay API')

    // Map condition to eBay condition IDs
    const conditionMap: Record<string, number> = {
      'New': 1000,
      'Like New': 1500,
      'Excellent': 2000,
      'Very Good': 2500,
      'Good': 3000,
      'Acceptable': 4000,
      'Used': 3000
    }
    
    const conditionId = conditionMap[listing.condition] || 3000

    // Use eBay Sell API for direct listing creation - much simpler approach
    const listingPayload = {
      "title": listing.title.substring(0, 80),
      "description": listing.description || 'No description provided',
      "categoryId": "281", // Default category - could be mapped properly later
      "condition": "USED_EXCELLENT", // Map from our condition
      "conditionDescription": listing.condition || 'Used',
      "format": "FIXED_PRICE",
      "pricingSummary": {
        "price": {
          "value": listing.price.toString(),
          "currency": "USD"
        }
      },
      "quantity": 1,
      "listingDuration": "GTC",
      "merchantLocationKey": "default",
      "images": listing.photos?.slice(0, 12).map(url => ({ imageUrl: url })) || []
    }

    console.log('📤 Creating eBay listing directly...')
    
    // Use Sell API Marketing endpoint to create listing directly
    const ebayResponse = await fetch('https://api.ebay.com/sell/inventory/v1/listing', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(listingPayload)
    })

    const responseData = await ebayResponse.json()
    console.log('📥 eBay API Response:', responseData)

    if (!ebayResponse.ok) {
      // Handle token expiration
      if (ebayResponse.status === 401) {
        throw new Error('eBay token expired. Please reconnect your eBay account.')
      }
      
      const errorMessage = responseData.errors?.[0]?.message || responseData.error_description || 'Unknown error'
      throw new Error(`eBay API Error: ${errorMessage}`)
    }

    const itemId = responseData.listingId || responseData.itemId
    console.log('✅ eBay listing created successfully:', itemId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemId: itemId,
        message: 'Item successfully listed on eBay',
        fees: responseData.fees || {}
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('eBay listing error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
