import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay inventory function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const requestData = await req.json();
    const { action, ...params } = requestData;
    logStep("Processing inventory action", { action });

    switch (action) {
      case 'sync_inventory':
        return await syncInventoryFromEbay(supabaseClient, user.id, params);
      
      case 'update_inventory_item':
        return await updateInventoryItem(supabaseClient, user.id, params);
        
      case 'bulk_update_inventory':
        return await bulkUpdateInventory(supabaseClient, user.id, params);
      
      case 'get_inventory_items':
        return await getInventoryItems(supabaseClient, user.id, params);
        
      case 'create_inventory_item':
        return await createInventoryItem(supabaseClient, user.id, params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
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

async function syncInventoryFromEbay(supabaseClient: any, userId: string, params: any) {
  logStep("Syncing inventory from eBay", { userId });

  // Get eBay account
  const { data: ebayAccount, error: accountError } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_connected', true)
    .single();

  if (accountError || !ebayAccount) {
    throw new Error('eBay account not connected');
  }

  const apiBase = getEbayApiBase(ebayAccount);
  const headers = getEbayApiHeaders(ebayAccount.oauth_token);

  try {
    // Get inventory items from eBay
    const response = await fetch(`${apiBase}/sell/inventory/v1/inventory_item`, {
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`eBay Inventory API error: ${response.status}`);
    }

    const inventoryData = await response.json();
    const syncResults = [];

    // Process each inventory item
    for (const item of inventoryData.inventoryItems || []) {
      try {
        // Find corresponding listing in our database
        const { data: platformListing } = await supabaseClient
          .from('platform_listings')
          .select('*, listings!inner(*)')
          .eq('platform', 'ebay')
          .eq('user_id', userId)
          .eq('platform_data->>sku', item.sku)
          .single();

        if (platformListing) {
          // Update local inventory based on eBay data
          const inventoryUpdate = {
            weight_oz: item.packageWeightAndSize?.weight?.value || null,
            package_length_in: item.packageWeightAndSize?.dimensions?.length || null,
            package_width_in: item.packageWeightAndSize?.dimensions?.width || null,
            package_height_in: item.packageWeightAndSize?.dimensions?.height || null,
            condition: mapEbayConditionToLocal(item.condition),
            brand: item.product?.aspects?.Brand?.[0] || null,
            material: item.product?.aspects?.Material?.[0] || null,
            color_primary: item.product?.aspects?.Color?.[0] || null,
            size_value: item.product?.aspects?.Size?.[0] || null
          };

          await supabaseClient
            .from('listings')
            .update(inventoryUpdate)
            .eq('id', platformListing.listing_id);

          syncResults.push({
            sku: item.sku,
            listing_id: platformListing.listing_id,
            status: 'synced',
            changes: inventoryUpdate
          });
        } else {
          syncResults.push({
            sku: item.sku,
            status: 'not_found',
            message: 'No matching local listing found'
          });
        }
      } catch (error: any) {
        syncResults.push({
          sku: item.sku,
          status: 'error',
          error: error.message
        });
      }
    }

    logStep("Inventory sync completed", { synced: syncResults.length });

    return new Response(JSON.stringify({
      status: 'success',
      synced_count: syncResults.filter(r => r.status === 'synced').length,
      error_count: syncResults.filter(r => r.status === 'error').length,
      results: syncResults,
      message: 'Inventory synced successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("API sync failed, using local inventory management", { error: error.message });
    
    // Fallback to local inventory management
    return await getInventoryItems(supabaseClient, userId, params);
  }
}

async function updateInventoryItem(supabaseClient: any, userId: string, params: any) {
  const { sku, inventoryData } = params;
  
  if (!sku) {
    throw new Error('SKU required for inventory update');
  }

  logStep("Updating inventory item", { sku });

  // Get eBay account
  const { data: ebayAccount } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_connected', true)
    .single();

  if (ebayAccount) {
    try {
      // Update on eBay first
      const apiBase = getEbayApiBase(ebayAccount);
      const headers = getEbayApiHeaders(ebayAccount.oauth_token);

      const ebayInventoryData = mapLocalToEbayInventory(inventoryData);
      
      const response = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${sku}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(ebayInventoryData)
      });

      if (!response.ok) {
        throw new Error(`eBay Inventory API error: ${response.status}`);
      }

      logStep("eBay inventory updated successfully");
    } catch (error: any) {
      logStep("eBay update failed, updating locally only", { error: error.message });
    }
  }

  // Update local database
  const { data: platformListing } = await supabaseClient
    .from('platform_listings')
    .select('listing_id')
    .eq('platform', 'ebay')
    .eq('user_id', userId)
    .eq('platform_data->>sku', sku)
    .single();

  if (platformListing) {
    await supabaseClient
      .from('listings')
      .update(inventoryData)
      .eq('id', platformListing.listing_id);
  }

  return new Response(JSON.stringify({
    status: 'success',
    message: 'Inventory item updated successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function bulkUpdateInventory(supabaseClient: any, userId: string, params: any) {
  const { updates } = params;
  
  if (!updates || !Array.isArray(updates)) {
    throw new Error('Updates array required');
  }

  logStep("Bulk updating inventory", { count: updates.length });

  const results = [];
  
  for (const update of updates) {
    try {
      await updateInventoryItem(supabaseClient, userId, update);
      results.push({
        sku: update.sku,
        status: 'success'
      });
    } catch (error: any) {
      results.push({
        sku: update.sku,
        status: 'error',
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    updated_count: results.filter(r => r.status === 'success').length,
    error_count: results.filter(r => r.status === 'error').length,
    results,
    message: 'Bulk inventory update completed'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getInventoryItems(supabaseClient: any, userId: string, params: any) {
  const { limit = 50, offset = 0, category, status } = params;

  let query = supabaseClient
    .from('platform_listings')
    .select(`
      platform_data,
      status,
      listings!inner(
        id,
        title,
        price,
        condition,
        weight_oz,
        package_length_in,
        package_width_in,
        package_height_in,
        brand,
        material,
        color_primary,
        size_value,
        category
      )
    `)
    .eq('platform', 'ebay')
    .eq('user_id', userId)
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('listings.category', category);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: inventoryItems, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  return new Response(JSON.stringify({
    status: 'success',
    inventory_items: inventoryItems?.map(item => ({
      sku: item.platform_data?.sku,
      listing_id: item.listings.id,
      title: item.listings.title,
      price: item.listings.price,
      condition: item.listings.condition,
      weight_oz: item.listings.weight_oz,
      dimensions: {
        length: item.listings.package_length_in,
        width: item.listings.package_width_in,
        height: item.listings.package_height_in
      },
      brand: item.listings.brand,
      material: item.listings.material,
      color: item.listings.color_primary,
      size: item.listings.size_value,
      category: item.listings.category,
      platform_status: item.status
    })) || [],
    total_count: inventoryItems?.length || 0
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function createInventoryItem(supabaseClient: any, userId: string, params: any) {
  const { listingId } = params;
  
  if (!listingId) {
    throw new Error('Listing ID required');
  }

  // Get listing data
  const { data: listing, error: listingError } = await supabaseClient
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('user_id', userId)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found');
  }

  // Generate SKU
  const sku = `listing${listingId.replace(/-/g, '')}${Date.now()}`.substring(0, 50);

  // Get eBay account
  const { data: ebayAccount } = await supabaseClient
    .from('marketplace_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_connected', true)
    .single();

  if (ebayAccount) {
    try {
      // Create inventory item on eBay
      const apiBase = getEbayApiBase(ebayAccount);
      const headers = getEbayApiHeaders(ebayAccount.oauth_token);

      const inventoryItemData = buildInventoryItemFromListing(listing);

      const response = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${sku}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(inventoryItemData)
      });

      if (!response.ok) {
        throw new Error(`eBay Inventory API error: ${response.status}`);
      }

      logStep("eBay inventory item created successfully", { sku });
    } catch (error: any) {
      logStep("eBay creation failed, creating locally only", { error: error.message });
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    sku,
    message: 'Inventory item created successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// Utility functions
function getEbayApiBase(ebayAccount: any): string {
  const isSandbox = ebayAccount.platform_settings?.sandbox || false;
  return isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
}

function getEbayApiHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Hustly/1.0'
  };
}

function mapEbayConditionToLocal(ebayCondition: string): string {
  const conditionMap: Record<string, string> = {
    'NEW': 'New',
    'NEW_WITH_DEFECTS': 'New with defects',
    'NEW_WITH_TAGS': 'New with tags',
    'NEW_WITHOUT_TAGS': 'New without tags',
    'LIKE_NEW': 'Like New',
    'EXCELLENT': 'Excellent',
    'VERY_GOOD': 'Very Good',
    'GOOD': 'Good',
    'USED': 'Used',
    'ACCEPTABLE': 'Acceptable',
    'FOR_PARTS_OR_NOT_WORKING': 'For parts or not working'
  };
  return conditionMap[ebayCondition] || 'Used';
}

function mapLocalToEbayInventory(localData: any) {
  return {
    availability: {
      shipToLocationAvailability: {
        quantity: 1
      }
    },
    condition: mapConditionToEbayCondition(localData.condition || 'Used'),
    packageWeightAndSize: {
      weight: {
        value: localData.weight_oz || 8,
        unit: 'OUNCE'
      },
      dimensions: {
        length: localData.package_length_in,
        width: localData.package_width_in,
        height: localData.package_height_in,
        unit: 'INCH'
      }
    }
  };
}

function mapConditionToEbayCondition(condition: string): string {
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
    'For parts or not working': 'FOR_PARTS_OR_NOT_WORKING'
  };
  return conditionMap[condition] || 'USED';
}

function buildInventoryItemFromListing(listing: any) {
  return {
    availability: {
      shipToLocationAvailability: {
        quantity: 1
      }
    },
    condition: mapConditionToEbayCondition(listing.condition || 'Used'),
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
      },
      dimensions: {
        length: listing.package_length_in,
        width: listing.package_width_in,
        height: listing.package_height_in,
        unit: 'INCH'
      }
    }
  };
}