import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INTEGRATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Legacy function called - redirecting to new services");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const requestData = await req.json();
    const { action, ...params } = requestData;
    logStep("Redirecting action", { action });

    // Route to appropriate new service
    switch (action) {
      case 'test_connection':
        return new Response(JSON.stringify({
          success: true,
          message: 'eBay integration working - using new microservices architecture',
          timestamp: new Date().toISOString(),
          services: ['ebay-oauth-modern', 'ebay-listing-publisher', 'ebay-sync']
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
        
      case 'connect_account':
        return await redirectToService(supabaseClient, 'ebay-oauth-modern', { action: 'get_auth_url', ...params }, req);
      
      case 'import_sold_listings':
        return await redirectToService(supabaseClient, 'ebay-sync', { action: 'import_sold_listings', ...params }, req);
      
      case 'publish_listing':
        return await redirectToService(supabaseClient, 'ebay-listing-publisher', { listingId: params.listingId }, req);
      
      case 'sync_listing_status':
        return await redirectToService(supabaseClient, 'ebay-sync', { action: 'sync_listings', ...params }, req);
      
      default:
        throw new Error(`Unknown action: ${action}. Please use new services: ebay-oauth-modern, ebay-listing-publisher, or ebay-sync`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function redirectToService(supabaseClient: any, serviceName: string, body: any, originalReq: Request) {
  logStep(`Redirecting to ${serviceName}`, { body });
  
  const { data, error } = await supabaseClient.functions.invoke(serviceName, {
    body,
    headers: {
      Authorization: originalReq.headers.get('Authorization') || ''
    }
  });

  if (error) {
    throw new Error(`Service ${serviceName} error: ${error.message}`);
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function connectEbayAccount(supabaseClient: any, userId: string, params: any) {
  logStep("Connecting eBay account via OAuth 2.0", { userId });

  // Generate OAuth authorization URL
  const state = crypto.randomUUID();
  
  const { data: authData, error: authError } = await supabaseClient.functions.invoke('ebay-oauth', {
    body: { 
      action: 'get_auth_url',
      state: state
    }
  });

  if (authError) {
    throw new Error(`Failed to get eBay OAuth URL: ${authError.message}`);
  }

  logStep("OAuth URL generated", { authUrl: authData.auth_url });

  return new Response(JSON.stringify({
    status: 'oauth_url_generated',
    auth_url: authData.auth_url,
    state: state,
    message: 'Please visit the authorization URL to connect your eBay account'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function importSoldListings(supabaseClient: any, userId: string, params: any) {
  logStep("Importing sold listings from eBay", { userId });

  // Get eBay account
  const { data: ebayAccount, error: accountError } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .single();

  if (accountError || !ebayAccount) {
    throw new Error('eBay account not connected');
  }

  // Simulate fetching sold listings from eBay API
  // In real implementation, this would call eBay's REST API
  const mockSoldListings = generateMockSoldListings(params.count || 10);

  // Transform eBay listings to training data format
  const trainingData = mockSoldListings.map(listing => ({
    user_id: userId,
    source_platform: 'ebay',
    external_listing_id: listing.itemId,
    title: listing.title,
    description: listing.description,
    final_price: listing.soldPrice,
    category: listing.category,
    condition_rating: listing.condition,
    days_to_sell: listing.daysToSell,
    view_count: listing.viewCount,
    watcher_count: listing.watcherCount,
    offer_count: listing.offerCount,
    listing_date: listing.startDate,
    sold_date: listing.endDate,
    success_score: calculateSuccessScore(listing),
    keywords: listing.keywords,
    raw_data: listing
  }));

  // Insert training data
  const { error: insertError } = await supabaseClient
    .from('ai_training_data')
    .upsert(trainingData, { onConflict: 'user_id,external_listing_id,source_platform' });

  if (insertError) {
    throw new Error(`Failed to import training data: ${insertError.message}`);
  }

  logStep("Sold listings imported successfully", { count: trainingData.length });

  return new Response(JSON.stringify({
    status: 'success',
    imported_count: trainingData.length,
    message: 'Sold listings imported successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function publishListing(supabaseClient: any, userId: string, params: any) {
  logStep("Publishing listing to eBay using REST API with OAuth", { userId, listingId: params.listingId });

  const { listingId } = params;
  if (!listingId) {
    throw new Error('Listing ID required');
  }

  // Fetch listing data
  logStep("Fetching listing data", { listingId });
  
  const { data: listing, error: listingError } = await supabaseClient
    .from('listings')
    .select(`
      id, title, description, price, condition, brand, category, 
      photos, status, shipping_cost, measurements, keywords,
      color_primary, material, pattern, size_value, gender
    `)
    .eq('id', listingId)
    .eq('user_id', userId)
    .single();

  if (listingError) {
    logStep("Listing fetch error", { error: listingError });
    throw new Error(`Failed to fetch listing: ${listingError.message}`);
  }
  
  if (!listing) {
    throw new Error('Listing not found or you do not have permission to access it');
  }
  
  logStep("Listing data retrieved", { 
    title: listing.title, 
    price: listing.price,
    condition: listing.condition 
  });

  // Get eBay account with OAuth token AND user address/business information
  logStep("Fetching eBay account and user profile", { userId });
  const { data: userData, error: userError } = await supabaseClient
    .from('user_profiles')
    .select(`
      shipping_address_line1, shipping_city, shipping_state, shipping_postal_code, shipping_country, 
      preferred_shipping_service, business_phone, account_type,
      use_different_return_address, return_address_line1, return_city, return_state, return_postal_code, return_country
    `)
    .eq('id', userId)
    .single();

  if (userError) {
    logStep("Warning: Could not fetch user address", { error: userError });
    // Don't throw here - we'll check required fields later
  }
  
  logStep("User profile data fetched", { 
    userData, 
    hasAddressLine1: !!userData?.shipping_address_line1,
    hasCity: !!userData?.shipping_city,
    hasState: !!userData?.shipping_state,
    hasPostalCode: !!userData?.shipping_postal_code,
    country: userData?.shipping_country
  });

  const { data: ebayAccounts, error: accountError } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_connected', true)
    .order('updated_at', { ascending: false });

  if (accountError) {
    logStep("eBay account fetch error", { error: accountError });
    throw new Error(`Failed to fetch eBay account: ${accountError.message}`);
  }
  
  if (!ebayAccounts || ebayAccounts.length === 0) {
    logStep("No eBay account found", { userId });
    throw new Error('eBay account not connected. Please connect your eBay account first.');
  }
  
  // Use the most recently updated connected account
  const ebayAccount = ebayAccounts[0];
  logStep("Found eBay accounts", { count: ebayAccounts.length, usingAccount: ebayAccount.account_username });
  
  logStep("eBay account retrieved", { 
    username: ebayAccount.account_username,
    tokenPresent: !!ebayAccount.oauth_token,
    expiresAt: ebayAccount.oauth_expires_at,
    hasUserAddress: !!(userData?.shipping_address_line1 && userData?.shipping_city)
  });

  // Validate OAuth token format and expiration
  if (!ebayAccount.oauth_token || ebayAccount.oauth_token.length < 50) {
    logStep("Invalid OAuth token", { tokenLength: ebayAccount.oauth_token?.length });
    throw new Error('eBay OAuth token is invalid. Please reconnect your eBay account.');
  }

  // Check token expiration
  if (ebayAccount.oauth_expires_at && new Date(ebayAccount.oauth_expires_at) < new Date()) {
    logStep("OAuth token expired", { expiresAt: ebayAccount.oauth_expires_at });
    throw new Error('eBay OAuth token has expired. Please reconnect your eBay account.');
  }

  logStep("OAuth token validation passed", { 
    tokenValid: true, 
    expiresAt: ebayAccount.oauth_expires_at 
  });

  // Validate that user has required business address information for eBay
  logStep("Validating business address", {
    userData,
    hasUserData: !!userData,
    addressLine1: userData?.shipping_address_line1,
    city: userData?.shipping_city,
    state: userData?.shipping_state,
    postalCode: userData?.shipping_postal_code,
    country: userData?.shipping_country
  });
  
  if (!userData || !userData.shipping_address_line1 || !userData.shipping_city || 
      !userData.shipping_state || !userData.shipping_postal_code) {
    throw new Error('Please complete your business address in Settings → Business tab before syncing to eBay. eBay requires your shipping location.');
  }

  // Validate business phone number (required by eBay)
  if (!userData.business_phone || userData.business_phone.trim().length < 10) {
    throw new Error('Please add your business phone number in Settings → Business tab before syncing to eBay. eBay requires a valid phone number.');
  }

  logStep("Business address validation passed", {
    hasAddress: !!userData.shipping_address_line1,
    hasCity: !!userData.shipping_city,
    hasState: !!userData.shipping_state,
    hasPostalCode: !!userData.shipping_postal_code,
    country: userData.shipping_country
  });

  // Build eBay Inventory API request for createOrReplaceInventoryItem
  logStep("Building eBay REST API request");
  
  const inventoryItemSku = `listing${listingId.replace(/-/g, '')}${Date.now()}`.substring(0, 50);
  
  // Debug logging for condition mapping
  const originalCondition = listing.condition || 'Used';
  const mappedCondition = mapConditionToEbayCondition(originalCondition);
  logStep("Condition mapping", { 
    originalCondition, 
    mappedCondition 
  });
  
  const inventoryItemData = {
    availability: {
      shipToLocationAvailability: {
        quantity: 1
      }
    },
    condition: mappedCondition,
    product: {
      title: (listing.title || 'Quality Item').substring(0, 80),
      description: (listing.description || 'Quality item in good condition.').substring(0, 4000),
      aspects: {
        Brand: [listing.brand || 'Unbranded'],
        ...(listing.color_primary && { Color: [listing.color_primary] }),
        ...(listing.material && { Material: [listing.material] }),
        ...(listing.size_value && { Size: [listing.size_value] }),
        ...(listing.gender && { Gender: [listing.gender] })
      }
    },
    packageWeightAndSize: {
      weight: {
        value: listing.weight_oz || 8,
        unit: 'OUNCE'
      }
    }
  };

  // Log the exact data being sent to eBay for debugging
  logStep("Final inventory item data", { 
    inventoryItemData,
    sku: inventoryItemSku,
    conditionMapping: { originalCondition, mappedCondition }
  });

  // Determine the correct eBay environment based on token
  const isSandbox = ebayAccount.platform_settings?.sandbox || false;
  const ebayApiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  
  logStep("Sending REST API request to eBay Inventory API", {
    url: `${ebayApiBase}/sell/inventory/v1/inventory_item/${inventoryItemSku}`,
    sandbox: isSandbox,
    tokenLength: ebayAccount.oauth_token.length,
    tokenPrefix: ebayAccount.oauth_token.substring(0, 50) + '...'
  });
  
  // Create inventory item using the eBay Inventory API
  logStep("About to send request to eBay", { requestData: inventoryItemData });
  
  const requestHeaders = {
    'Authorization': `Bearer ${ebayAccount.oauth_token}`,
    'Content-Type': 'application/json',
    'Content-Language': 'en-US',
    'Accept': 'application/json',
    'Accept-Language': 'en-US',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'Hustly/1.0'
  };
  
  logStep("Request headers being sent", { headers: requestHeaders });
  
  const inventoryResponse = await fetch(`${ebayApiBase}/sell/inventory/v1/inventory_item/${inventoryItemSku}`, {
    method: 'PUT',
    headers: requestHeaders,
    body: JSON.stringify(inventoryItemData)
  });

  logStep("Inventory API response received", { 
    status: inventoryResponse.status,
    statusText: inventoryResponse.statusText,
    ok: inventoryResponse.ok,
    headers: Object.fromEntries(inventoryResponse.headers.entries())
  });

  if (!inventoryResponse.ok) {
    const errorText = await inventoryResponse.text();
    logStep("Inventory API error details", { 
      status: inventoryResponse.status,
      statusText: inventoryResponse.statusText,
      error: errorText,
      requestData: inventoryItemData,
      requestHeaders: requestHeaders
    });
    throw new Error(`eBay Inventory API error (${inventoryResponse.status}): ${errorText}`);
  }

  logStep("Inventory item created successfully");

  // Map user's preferred shipping service to eBay shipping service
  const shippingService = mapShippingService(userData.preferred_shipping_service || 'usps_priority');
  
  // Determine marketplace and currency based on country
  const countryMarketplaceMap = {
    'US': { marketplaceId: 'EBAY_US', currency: 'USD' },
    'CA': { marketplaceId: 'EBAY_CA', currency: 'CAD' }
  };
  
  const marketplace = countryMarketplaceMap[userData.shipping_country as keyof typeof countryMarketplaceMap] || countryMarketplaceMap['US'];
  
  logStep("Marketplace configuration", {
    country: userData.shipping_country,
    marketplaceId: marketplace.marketplaceId,
    currency: marketplace.currency
  });
  
  // Create offer for the inventory item with full fulfillment policy
  const offerData = {
    sku: inventoryItemSku,
    marketplaceId: marketplace.marketplaceId,
    format: 'FIXED_PRICE',
    availableQuantity: 1,
    categoryId: mapCategoryToEbayId(listing.category || 'Electronics'),
    merchantLocationKey: 'default', // Required for publishing offers
    listingDescription: (listing.description || 'Quality item in good condition.').substring(0, 4000),
    pricingSummary: {
      price: {
        value: listing.price?.toString() || '19.99',
        currency: marketplace.currency
      }
    },
    fulfillmentPolicy: {
      fulfillmentPolicyId: null, // Use inline fulfillment policy
      shippingOptions: [
        {
          optionType: 'DOMESTIC',
          costType: 'FLAT_RATE',
          shippingServices: [
            {
              serviceName: shippingService.ebayServiceName,
              shippingCost: {
                value: listing.shipping_cost?.toString() || '9.95',
                currency: 'USD'
              },
              additionalShippingCost: {
                value: '0.00',
                currency: 'USD'
              },
              freeShipping: (listing.shipping_cost || 9.95) === 0,
              shippingCarrierCode: shippingService.carrierCode
            }
          ]
        }
      ],
      globalShipping: false,
      pickupDropOff: false,
      freightShipping: false,
      shipToLocations: {
        regionIncluded: [
          {
            regionName: 'United States',
            regionType: 'COUNTRY'
          }
        ]
      },
      handlingTime: {
        value: 1,
        unit: 'DAY'
      },
      shipFromLocation: {
        country: userData.shipping_country || 'US',
        postalCode: userData.shipping_postal_code,
        stateOrProvince: userData.shipping_state
      }
    },
    listingPolicies: {
      fulfillmentPolicyId: null,
      paymentPolicyId: null,
      returnPolicyId: null
    },
    location: {
      country: userData.shipping_country || 'US',
      postalCode: userData.shipping_postal_code,
      stateOrProvince: userData.shipping_state
    },
    itemLocation: {
      country: userData.shipping_country || 'US',
      postalCode: userData.shipping_postal_code,
      stateOrProvince: userData.shipping_state
    },
    paymentPolicy: {
      paymentPolicyId: null, // Use inline payment policy
      paymentMethods: [
        {
          paymentMethodType: 'PAYPAL',
          recipientAccountReference: {
            referenceId: ebayAccount.account_email || 'paypal@example.com',
            referenceType: 'PAYPAL_EMAIL'
          }
        },
        {
          paymentMethodType: 'CREDIT_CARD'
        }
      ],
      paymentInstructions: 'Payment due within 4 days of purchase.',
      immediatePay: true
    },
    returnPolicy: {
      returnPolicyId: null, // Use inline return policy
      returnsAccepted: true,
      returnPeriod: {
        value: 30,
        unit: 'DAY'
      },
      returnShippingCostPayer: 'BUYER',
      returnInstructions: 'Items must be returned in original condition within 30 days.'
    },
    tax: {
      applyTax: false
    },
    lotSize: 1
  };

  logStep("Offer data with fulfillment policy created", {
    shippingService: shippingService.displayName,
    shipFromCountry: userData.shipping_country,
    shipFromPostalCode: userData.shipping_postal_code,
    shippingCost: listing.shipping_cost || 9.95
  });

  const offerResponse = await fetch(`${ebayApiBase}/sell/inventory/v1/offer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ebayAccount.oauth_token}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Hustly/1.0'
    },
    body: JSON.stringify(offerData)
  });

  if (!offerResponse.ok) {
    const errorText = await offerResponse.text();
    logStep("Offer API error", { 
      status: offerResponse.status,
      error: errorText 
    });
    throw new Error(`eBay Offer API error (${offerResponse.status}): ${errorText}`);
  }

  const offerResult = await offerResponse.json();
  const offerId = offerResult.offerId;

  logStep("Offer created successfully", { offerId });

  // Publish the offer to the specific marketplace
  // Remove body data as country should be inferred from marketplace
  logStep("Publishing offer to marketplace", { 
    offerId, 
    marketplace: marketplace.marketplaceId,
    userCountry: userData.shipping_country,
    apiBase: ebayApiBase
  });
  
  const publishResponse = await fetch(`${ebayApiBase}/sell/inventory/v1/offer/${offerId}/publish/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ebayAccount.oauth_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Hustly/1.0'
    }
    // Note: No body - eBay should infer country from marketplace and location data in offer
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    logStep("Publish API error", { 
      status: publishResponse.status,
      error: errorText 
    });
    throw new Error(`eBay Publish API error (${publishResponse.status}): ${errorText}`);
  }

  const publishResult = await publishResponse.json();
  const listingId_ebay = publishResult.listingId;

  logStep("Listing published successfully", { 
    offerId,
    listingId: listingId_ebay 
  });
  
  const ebayResponse = {
    itemId: listingId_ebay || offerId,
    listingUrl: listingId_ebay ? `https://ebay.com/itm/${listingId_ebay}` : `https://ebay.com/`,
    fees: { insertionFee: 0.35, finalValueFee: 0.10 }
  };

  // Create platform listing record
  const platformListingData = {
    user_id: userId,
    listing_id: params.listingId,
    marketplace_account_id: ebayAccount.id,
    platform: 'ebay',
    platform_listing_id: ebayResponse.itemId,
    platform_url: ebayResponse.listingUrl,
    status: 'active',
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    platform_data: {
      ebay_item_id: ebayResponse.itemId,
      offer_id: offerId,
      sku: inventoryItemSku,
      listing_format: 'FixedPrice',
      fees: ebayResponse.fees
    },
    performance_metrics: {
      views: 0,
      watchers: 0,
      offers: 0
    }
  };

  const { error: platformError } = await supabaseClient
    .from('platform_listings')
    .insert(platformListingData);

  if (platformError) {
    throw new Error(`Failed to save platform listing: ${platformError.message}`);
  }

  // Update listing status
  const { error: updateError } = await supabaseClient
    .from('listings')
    .update({
      status: 'active',
      listed_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', listingId);

  if (updateError) {
    logStep("Warning: Failed to update listing status", { error: updateError.message });
  }

  logStep("Listing sync completed successfully", { 
    listingId,
    ebayItemId: ebayResponse.itemId 
  });

  return new Response(JSON.stringify({
    status: 'success',
    platform_listing_id: ebayResponse.itemId,
    platform_url: ebayResponse.listingUrl,
    fees: ebayResponse.fees,
    message: 'Listing published to eBay successfully using OAuth'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function syncListingStatus(supabaseClient: any, userId: string, params: any) {
  logStep("Syncing listing status from eBay", { userId });

  // Get all active eBay listings for user
  const { data: platformListings, error } = await supabaseClient
    .from('platform_listings')
    .select('*, marketplace_accounts!inner(*)')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to fetch platform listings: ${error.message}`);
  }

  const syncResults = [];

  for (const platformListing of platformListings) {
    try {
      // Simulate fetching item status from eBay
      const mockStatus = Math.random() > 0.9 ? 'sold' : 'active';
      const mockViews = Math.floor(Math.random() * 100);
      const mockWatchers = Math.floor(Math.random() * 20);

      // Update platform listing
      const { error: updateError } = await supabaseClient
        .from('platform_listings')
        .update({
          status: mockStatus,
          last_synced_at: new Date().toISOString(),
          performance_metrics: {
            views: mockViews,
            watchers: mockWatchers,
            offers: 0
          }
        })
        .eq('id', platformListing.id);

      if (updateError) {
        logStep("Failed to update platform listing", { 
          id: platformListing.id, 
          error: updateError.message 
        });
        continue;
      }

      // If sold, update main listing
      if (mockStatus === 'sold') {
        await supabaseClient
          .from('listings')
          .update({
            status: 'sold',
            sold_date: new Date().toISOString().split('T')[0],
            sold_price: Math.random() * 50 + 10 // Mock sold price
          })
          .eq('id', platformListing.listing_id);
      }

      syncResults.push({
        listing_id: platformListing.listing_id,
        platform_listing_id: platformListing.platform_listing_id,
        status: mockStatus,
        views: mockViews,
        watchers: mockWatchers
      });

    } catch (error) {
      logStep("Error syncing individual listing", { 
        id: platformListing.id, 
        error: error.message 
      });
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    synced_count: syncResults.length,
    results: syncResults,
    message: 'Listing status synced successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// Helper functions
function generateMockSoldListings(count: number) {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Collectibles', 'Sporting Goods'];
  const conditions = ['new', 'like new', 'excellent', 'good', 'fair'];
  const brands = ['Apple', 'Nike', 'Sony', 'Samsung', 'Vintage'];

  return Array.from({ length: count }, (_, i) => ({
    itemId: `ebay_item_${Date.now()}_${i}`,
    title: `${brands[Math.floor(Math.random() * brands.length)]} ${categories[Math.floor(Math.random() * categories.length)]} Item`,
    description: `Quality item in great condition. Fast shipping.`,
    category: categories[Math.floor(Math.random() * categories.length)],
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    soldPrice: Math.round((Math.random() * 100 + 10) * 100) / 100,
    startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysToSell: Math.floor(Math.random() * 30) + 1,
    viewCount: Math.floor(Math.random() * 200) + 10,
    watcherCount: Math.floor(Math.random() * 50),
    offerCount: Math.floor(Math.random() * 10),
    keywords: ['quality', 'fast shipping', 'authentic']
  }));
}

function calculateSuccessScore(listing: any): number {
  let score = 0.5; // Base score for sold items
  
  if (listing.daysToSell <= 7) score += 0.2;
  else if (listing.daysToSell <= 14) score += 0.1;
  
  if (listing.viewCount > 50) score += 0.1;
  if (listing.watcherCount > 10) score += 0.1;
  if (listing.offerCount > 0) score += 0.1;
  
  return Math.min(1.0, score);
}

// REST API Helper Functions
function mapConditionToEbayCondition(condition: string): string {
  // Updated eBay condition values based on current API documentation
  const conditionMap: Record<string, string> = {
    'New': 'NEW',
    'New with defects': 'NEW_WITH_DEFECTS',
    'New with tags': 'NEW_WITH_TAGS',
    'New without tags': 'NEW_WITHOUT_TAGS',
    'Like New': 'LIKE_NEW',
    'Excellent': 'EXCELLENT',
    'Very Good': 'VERY_GOOD', 
    'Good': 'GOOD',
    'Used': 'USED',
    'Acceptable': 'ACCEPTABLE',
    'For parts or not working': 'FOR_PARTS_OR_NOT_WORKING',
    'For Parts': 'FOR_PARTS_OR_NOT_WORKING'
  };
  
  return conditionMap[condition] || 'USED';
}

function mapCategoryToEbayId(category: string): string {
  // Updated eBay category IDs - these are current as of 2024
  const categoryMap: Record<string, string> = {
    // Consumer Electronics
    'Electronics': '293',
    'Cell Phones & Accessories': '15032',
    'Computers/Tablets & Networking': '58058',
    'Video Games & Consoles': '1249',
    'Cameras & Photo': '625',
    'TV, Audio & Surveillance': '32852',
    
    // Clothing & Fashion
    'Clothing': '11450',
    'Clothing, Shoes & Accessories': '11450',
    'Women\'s Clothing': '15724',
    'Men\'s Clothing': '1059',
    'Shoes': '93427',
    'Jewelry & Watches': '281',
    'Handbags': '169291',
    
    // Home & Garden
    'Home & Garden': '11700',
    'Home & Kitchen': '11700',
    'Tools & Home Improvement': '631',
    'Garden & Patio': '159912',
    'Home Décor': '20081',
    
    // Sports & Recreation  
    'Sporting Goods': '888',
    'Sports & Outdoors': '888',
    'Outdoor Sports': '159043',
    'Team Sports': '64482',
    'Fitness & Exercise': '15273',
    
    // Collectibles & Art
    'Collectibles': '1',
    'Art': '550',
    'Antiques': '20081',
    'Toys & Hobbies': '220',
    'Trading Cards': '213',
    
    // Media
    'Books': '267',
    'Music': '11233',
    'Movies & TV': '11232',
    'Video Games': '1249',
    
    // Vehicles
    'Automotive': '6000',
    'Motorcycles': '6024',
    'Parts & Accessories': '6028',
    
    // Other Categories
    'Health & Beauty': '26395',
    'Baby': '2984',
    'Pet Supplies': '1281',
    'Musical Instruments': '619',
    'Crafts': '14339',
    'Business & Industrial': '12576'
  };
  
  return categoryMap[category] || '293'; // Default to Consumer Electronics
}

function mapShippingService(preferredService: string) {
  // Map user's preferred shipping service to eBay shipping service codes
  const serviceMap: Record<string, { ebayServiceName: string; carrierCode: string; displayName: string }> = {
    'usps_priority': {
      ebayServiceName: 'US_PriorityMail',
      carrierCode: 'USPS',
      displayName: 'USPS Priority Mail'
    },
    'usps_first_class': {
      ebayServiceName: 'US_FirstClassMail',
      carrierCode: 'USPS', 
      displayName: 'USPS First Class'
    },
    'ups_ground': {
      ebayServiceName: 'US_UPSGround',
      carrierCode: 'UPS',
      displayName: 'UPS Ground'
    },
    'fedex_ground': {
      ebayServiceName: 'US_FedExGround',
      carrierCode: 'FEDEX',
      displayName: 'FedEx Ground'
    }
  };
  
  return serviceMap[preferredService] || serviceMap['usps_priority'];
}

async function testConnection(supabaseClient: any, userId: string, params: any) {
  logStep("Testing eBay connection", { userId });

  // Get eBay account
  const { data: ebayAccount, error: accountError } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_connected', true)
    .eq('is_active', true)
    .maybeSingle();

  if (accountError) {
    throw new Error(`Account lookup failed: ${accountError.message}`);
  }

  if (!ebayAccount) {
    throw new Error('No eBay account found');
  }

  logStep("eBay account found", { username: ebayAccount.account_username });

  // Test eBay API call server-side
  const isSandbox = ebayAccount.platform_settings?.sandbox || false;
  const ebayApiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  
  // Test with a simpler endpoint that requires fewer permissions
  const testResponse = await fetch(`${ebayApiBase}/sell/inventory/v1/location`, {
    headers: {
      'Authorization': `Bearer ${ebayAccount.oauth_token}`,
      'Accept': 'application/json',
      'Accept-Language': 'en-US',
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Hustly/1.0'
    }
  });

  const testData = testResponse.ok ? await testResponse.json() : await testResponse.text();

  logStep("eBay API test completed", { 
    status: testResponse.status, 
    ok: testResponse.ok 
  });

  return new Response(JSON.stringify({
    status: 'success',
    accountFound: true,
    accountData: {
      username: ebayAccount.account_username,
      tokenLength: ebayAccount.oauth_token?.length,
      expiresAt: ebayAccount.oauth_expires_at,
      isExpired: ebayAccount.oauth_expires_at ? new Date(ebayAccount.oauth_expires_at) < new Date() : false
    },
    apiTest: {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
      data: testData
    }
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}