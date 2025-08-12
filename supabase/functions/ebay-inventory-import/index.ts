import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EbayListing {
  itemId: string;
  title: string;
  price: {
    value: string;
    currency: string;
  };
  condition: string;
  conditionId: string;
  categoryPath: string;
  categoryId: string;
  itemLocation: {
    city: string;
    stateOrProvince: string;
    country: string;
    postalCode: string;
  };
  galleryURL: string;
  pictureURLLarge: string[];
  viewItemURL: string;
  sellingStatus: {
    currentPrice: {
      value: string;
      currency: string;
    };
    sellingState: string;
    timeLeft: string;
  };
  listingInfo: {
    startTime: string;
    endTime: string;
    listingType: string;
  };
  primaryCategory: {
    categoryId: string;
    categoryName: string;
  };
  quantity: number;
  quantityAvailable: number;
  shippingInfo: any;
  returnPolicy: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();
    console.log('🔄 [EBAY-INVENTORY-IMPORT] Action:', action, 'User:', user.id);
    console.log('🔍 [EBAY-INVENTORY-IMPORT] Checking marketplace_accounts table for eBay connection...');

    // Get user's eBay connection from marketplace_accounts table
    const { data: account, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'ebay')
      .single();

    if (accountError || !account) {
      throw new Error('No eBay account connected');
    }

    // Debug: Log account fields to see what's available
    console.log('🔍 [EBAY-INVENTORY-IMPORT] Account fields:', {
      has_oauth_token: !!account.oauth_token,
      has_access_token: !!account.access_token,
      oauth_token_preview: account.oauth_token ? account.oauth_token.substring(0, 20) + '...' : 'null',
      access_token_preview: account.access_token ? account.access_token.substring(0, 20) + '...' : 'null',
      expires_at: account.oauth_expires_at
    });

    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    const credentials = btoa(`${ebayClientId}:${ebayClientSecret}`);

    switch (action) {
      case 'get_active_listings': {
        // Get ONLY active listings using the Offer API (not all inventory items)
        // First get offers which represent actual active listings
        const response = await fetch('https://api.ebay.com/sell/inventory/v1/offer?limit=100', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.oauth_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'en-US'
          }
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay API Error:', error);
          throw new Error(`eBay API Error: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        
        // Parse Offer API response - offers represent active listings
        const offers = jsonResponse.offers || [];
        
        console.log(`✅ Found ${offers.length} active offers (published listings)`);
        
        // Now we need to get the inventory details for each offer
        // Offers contain SKUs but not full product details
        const activeListings: any[] = [];
        
        for (const offer of offers) {
          if (offer.sku && offer.status === 'PUBLISHED') {
            // Get the inventory item details for this SKU
            const itemResponse = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(offer.sku)}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${account.oauth_token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': 'en-US'
              }
            });
            
            if (itemResponse.ok) {
              const item = await itemResponse.json();
              // Add offer details to the item
              activeListings.push({
                ...item,
                offerId: offer.offerId,
                listingId: offer.listing?.listingId,
                price: offer.pricingSummary?.price?.value,
                currency: offer.pricingSummary?.price?.currency,
                quantity: offer.availableQuantity,
                status: 'active' // This is truly active since it's a published offer
              });
            }
          }
        }
        
        console.log(`✅ Retrieved details for ${activeListings.length} active listings`);
        
        return new Response(JSON.stringify({
          success: true,
          listings: activeListings,
          totalCount: activeListings.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_inventory_items': {
        // Alternative: Use Inventory API for more detailed data
        const limit = params.limit || 100;
        const offset = params.offset || 0;
        
        const response = await fetch(
          `https://api.ebay.com/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${account.oauth_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay Inventory API Error:', error);
          throw new Error(`eBay API Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Found ${data.total} inventory items`);
        
        return new Response(JSON.stringify({
          success: true,
          inventoryItems: data.inventoryItems || [],
          total: data.total,
          limit: data.limit,
          offset: data.offset,
          next: data.next
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'import_to_hustly': {
        const { listings } = params;
        
        if (!listings || !Array.isArray(listings)) {
          throw new Error('No listings provided for import');
        }

        console.log(`📥 Importing ${listings.length} listings to Hustly`);
        
        const importResults: any[] = [];
        
        for (const inventoryItem of listings) {
          try {
            // Ensure we have a SKU at minimum
            if (!inventoryItem || !inventoryItem.sku) {
              console.log('⚠️ Skipping invalid item: No SKU');
              importResults.push({
                sku: 'unknown',
                action: 'skipped',
                success: false,
                error: 'No SKU found'
              });
              continue;
            }

            const sku = inventoryItem.sku;

            // Skip items without product data
            if (!inventoryItem.product) {
              console.log(`⚠️ Skipping item ${sku}: No product data`);
              importResults.push({
                sku: sku,
                action: 'skipped',
                success: false,
                error: 'No product data'
              });
              continue;
            }

            // Map Inventory API format to our database format
            const title = inventoryItem.product?.title || 'Untitled Item';
            const description = inventoryItem.product?.description || '';
            const condition = inventoryItem.condition || 'USED_GOOD';
            const quantity = inventoryItem.quantity || inventoryItem.availability?.shipToLocationAvailability?.quantity || 1;
            const imageUrls = inventoryItem.product?.imageUrls || [];
            
            // Price comes from the offer data we added (for active listings)
            const price = inventoryItem.price || 0;
            
            // Status is 'active' if this came from a published offer, otherwise 'draft'
            const status = inventoryItem.status || 'draft';

            // Check if listing already exists by SKU (use title as fallback since we might not have ebay_sku column)
            const { data: existingListing } = await supabase
              .from('listings')
              .select('id')
              .eq('title', title)
              .eq('user_id', user.id)
              .eq('platform', 'ebay')
              .single();

            if (existingListing) {
              // Update existing listing
              const { data: updated, error: updateError } = await supabase
                .from('listings')
                .update({
                  title: title,
                  description: description,
                  condition: mapInventoryCondition(condition),
                  quantity: quantity,
                  updated_at: new Date().toISOString(),
                  ebay_sync_status: 'synced',
                  ebay_last_sync: new Date().toISOString()
                })
                .eq('id', existingListing.id)
                .select()
                .single();

              if (updateError) throw updateError;
              
              importResults.push({
                sku: sku,
                listingId: existingListing.id,
                action: 'updated',
                success: true
              });
            } else {
              // Create new listing
              const { data: created, error: createError } = await supabase
                .from('listings')
                .insert({
                  user_id: user.id,
                  title: title,
                  // Store SKU in description since we might not have ebay_sku column
                  description: description + `\n\n[eBay SKU: ${sku}]`,
                  price: price,
                  condition: mapInventoryCondition(condition),
                  quantity: quantity,
                  status: status, // Use the status we determined (active for published offers, draft otherwise)
                  platform: 'ebay',
                  ebay_sync_status: 'synced',
                  ebay_last_sync: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (createError) throw createError;
              
              // Import images if available
              if (imageUrls.length > 0) {
                for (let i = 0; i < imageUrls.length; i++) {
                  await supabase
                    .from('listing_images')
                    .insert({
                      listing_id: created.id,
                      image_url: imageUrls[i],
                      display_order: i,
                      created_at: new Date().toISOString()
                    });
                }
              }
              
              importResults.push({
                sku: sku,
                listingId: created.id,
                action: 'created',
                success: true
              });
            }
          } catch (error) {
            const errorSku = inventoryItem?.sku || 'unknown';
            console.error(`❌ Failed to import listing ${errorSku}:`, error);
            importResults.push({
              sku: errorSku,
              action: 'failed',
              success: false,
              error: error.message || String(error)
            });
          }
        }

        const successCount = importResults.filter(r => r.success).length;
        console.log(`✅ Successfully imported ${successCount}/${listings.length} listings`);

        return new Response(JSON.stringify({
          success: true,
          imported: successCount,
          failed: listings.length - successCount,
          results: importResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_all': {
        // Full sync: Get all eBay listings and import/update in Hustly
        console.log('🔄 Starting full inventory sync...');
        
        // Step 1: Get all active listings from eBay
        const allListings = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) { // Limit to 10 pages for safety
          const response = await fetch('https://api.ebay.com/ws/api.dll', {
            method: 'POST',
            headers: {
              'X-EBAY-API-SITEID': '0',
              'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
              'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
              'X-EBAY-API-IAF-TOKEN': account.oauth_token,
              'Content-Type': 'text/xml',
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
              <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                <RequesterCredentials>
                  <eBayAuthToken>${account.oauth_token}</eBayAuthToken>
                </RequesterCredentials>
                <ActiveList>
                  <Include>true</Include>
                  <Pagination>
                    <EntriesPerPage>100</EntriesPerPage>
                    <PageNumber>${page}</PageNumber>
                  </Pagination>
                </ActiveList>
                <DetailLevel>ReturnAll</DetailLevel>
              </GetMyeBaySellingRequest>`
          });

          if (response.ok) {
            const xmlText = await response.text();
            const items = parseEbayXmlResponse(xmlText);
            allListings.push(...items);
            
            hasMore = items.length === 100;
            page++;
          } else {
            hasMore = false;
          }
        }

        console.log(`📊 Found ${allListings.length} total eBay listings`);

        // Step 2: Import all listings to Hustly
        const importResults = [];
        for (const listing of allListings) {
          // ... (import logic same as above)
        }

        return new Response(JSON.stringify({
          success: true,
          totalEbayListings: allListings.length,
          imported: importResults.filter(r => r.success).length,
          failed: importResults.filter(r => !r.success).length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function parseEbayXmlResponse(xml: string): any[] {
  // This is a simplified parser - in production use a proper XML parser
  const items = [];
  const itemMatches = xml.matchAll(/<Item>(.*?)<\/Item>/gs);
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    const item: any = {};
    
    // Extract basic fields
    item.itemId = extractXmlValue(itemXml, 'ItemID');
    item.title = extractXmlValue(itemXml, 'Title');
    item.price = {
      value: extractXmlValue(itemXml, 'CurrentPrice'),
      currency: extractXmlValue(itemXml, 'CurrentPrice', 'currencyID')
    };
    item.conditionId = extractXmlValue(itemXml, 'ConditionID');
    item.categoryId = extractXmlValue(itemXml, 'PrimaryCategoryID');
    item.quantity = parseInt(extractXmlValue(itemXml, 'Quantity') || '1');
    item.sellingStatus = {
      sellingState: extractXmlValue(itemXml, 'SellingState')
    };
    
    // Extract picture URLs
    const pictureUrls = itemXml.matchAll(/<PictureURL>(.*?)<\/PictureURL>/g);
    item.pictureURLLarge = Array.from(pictureUrls).map(m => m[1]);
    
    items.push(item);
  }
  
  return items;
}

function extractXmlValue(xml: string, tag: string, attribute?: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function mapEbayCondition(conditionId: string): string {
  const conditionMap: Record<string, string> = {
    '1000': 'new',
    '1500': 'new_other',
    '1750': 'new_with_defects',
    '2000': 'manufacturer_refurbished',
    '2500': 'seller_refurbished',
    '3000': 'used_excellent',
    '4000': 'used_very_good',
    '5000': 'used_good',
    '6000': 'used_acceptable',
    '7000': 'for_parts'
  };
  
  return conditionMap[conditionId] || 'used_good';
}

function mapInventoryCondition(condition: string): string {
  // Map eBay Inventory API condition values to our database values
  const conditionMap: Record<string, string> = {
    'NEW': 'new',
    'LIKE_NEW': 'used_excellent',
    'NEW_OTHER': 'new_other',
    'NEW_WITH_DEFECTS': 'new_with_defects',
    'MANUFACTURER_REFURBISHED': 'manufacturer_refurbished',
    'CERTIFIED_REFURBISHED': 'seller_refurbished',
    'EXCELLENT_REFURBISHED': 'seller_refurbished',
    'VERY_GOOD_REFURBISHED': 'seller_refurbished',
    'GOOD_REFURBISHED': 'seller_refurbished',
    'SELLER_REFURBISHED': 'seller_refurbished',
    'USED_EXCELLENT': 'used_excellent',
    'USED_VERY_GOOD': 'used_very_good',
    'USED_GOOD': 'used_good',
    'USED_ACCEPTABLE': 'used_acceptable',
    'FOR_PARTS_OR_NOT_WORKING': 'for_parts'
  };
  
  return conditionMap[condition] || 'used_good';
}

function mapEbayStatus(sellingState: string): string {
  const statusMap: Record<string, string> = {
    'Active': 'active',
    'Ended': 'ended',
    'Sold': 'sold',
    'Unsold': 'unsold'
  };
  
  return statusMap[sellingState] || 'draft';
}
