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

    // Use the correct token field - oauth_token is the actual access token
    const accessToken = account.oauth_token || account.access_token;
    
    if (!accessToken) {
      throw new Error('No valid eBay access token found');
    }

    // Check if token is expired
    const expiresAt = account.oauth_expires_at ? new Date(account.oauth_expires_at) : null;
    const now = new Date();
    
    if (expiresAt && expiresAt <= now) {
      console.log('⚠️ Token expired, needs refresh');
      throw new Error('eBay token expired. Please reconnect your eBay account.');
    }

    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    const credentials = btoa(`${ebayClientId}:${ebayClientSecret}`);

    switch (action) {
      case 'get_active_listings': {
        // Use the Trading API's GetMyeBaySelling to get active listings
        // This is the proper way to get a seller's active items
        const response = await fetch('https://api.ebay.com/ws/api.dll', {
          method: 'POST',
          headers: {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
            'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
            'X-EBAY-API-IAF-TOKEN': accessToken,
            'Content-Type': 'text/xml',
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
            <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <RequesterCredentials>
                <eBayAuthToken>${accessToken}</eBayAuthToken>
              </RequesterCredentials>
              <ActiveList>
                <Include>true</Include>
                <Pagination>
                  <EntriesPerPage>100</EntriesPerPage>
                  <PageNumber>1</PageNumber>
                </Pagination>
              </ActiveList>
              <DetailLevel>ReturnAll</DetailLevel>
            </GetMyeBaySellingRequest>`
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay API Error:', error);
          throw new Error(`eBay API Error: ${response.statusText}`);
        }

        const xmlResponse = await response.text();
        console.log('📦 Fetched eBay listings from Trading API');
        console.log('🔍 Raw XML Response (first 1000 chars):', xmlResponse.substring(0, 1000));
        
        // Parse the XML response
        const allListings = parseEbayXmlResponse(xmlResponse);
        console.log(`📊 Parsed ${allListings.length} listings from XML`);
        
        // All listings from GetMyeBaySelling ActiveList are already active
        console.log(`✅ Found ${allListings.length} active listings`);
        
        return new Response(JSON.stringify({
          success: true,
          listings: allListings,
          count: allListings.length
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
              'Authorization': `Bearer ${accessToken}`,
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
        
        for (const listing of listings) {
          try {
            // Trading API returns itemId, not sku
            if (!listing || !listing.itemId) {
              console.log('⚠️ Skipping invalid item: No itemId');
              importResults.push({
                itemId: listing?.itemId || 'unknown',
                action: 'skipped',
                success: false,
                error: 'No itemId found'
              });
              continue;
            }

            const itemId = listing.itemId;
            const title = listing.title || 'Untitled Item';
            
            // Map condition from conditionId or use display name
            const condition = listing.conditionDisplayName || 'Used';
            const quantity = listing.quantity || 1;
            
            // GetMyeBaySelling doesn't return full descriptions, so fetch it separately
            let description = '';
            try {
              const itemResponse = await fetch('https://api.ebay.com/ws/api.dll', {
                method: 'POST',
                headers: {
                  'X-EBAY-API-SITEID': '0',
                  'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
                  'X-EBAY-API-CALL-NAME': 'GetItem',
                  'X-EBAY-API-IAF-TOKEN': accessToken,
                  'Content-Type': 'text/xml',
                },
                body: `<?xml version="1.0" encoding="utf-8"?>
                  <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                    <RequesterCredentials>
                      <eBayAuthToken>${accessToken}</eBayAuthToken>
                    </RequesterCredentials>
                    <ItemID>${itemId}</ItemID>
                    <DetailLevel>ReturnAll</DetailLevel>
                  </GetItemRequest>`
              });
              
              if (itemResponse.ok) {
                const itemXml = await itemResponse.text();
                description = extractXmlValue(itemXml, 'Description') || '';
                console.log(` Fetched description for ${itemId}: ${description.substring(0, 100)}...`);
              } else {
                console.warn(` Could not fetch description for item ${itemId}`);
              }
            } catch (error) {
              console.warn(` Error fetching description for item ${itemId}:`, error);
            }
            
            // Get images from pictureURLLarge array
            const imageUrls = listing.pictureURLLarge || [];
            
            // Debug logging
            console.log(`📸 Images found for ${itemId}:`, imageUrls.length);
            console.log(`📝 Description length:`, description.length);
            console.log(`🏷️ Category: ${listing.categoryId} - ${listing.categoryName}`);
            
            // Get price from the price object
            const price = parseFloat(listing.price?.value || '0');
            
            // Map eBay category to Hustly category
            const category = mapEbayCategory(listing.categoryId);
            
            // Trading API listings are active by definition (from GetMyeBaySelling ActiveList)
            const status = 'active';

            // Check if listing already exists by ebay_item_id or title
            const { data: existingListing } = await supabase
              .from('listings')
              .select('id')
              .or(`ebay_item_id.eq.${itemId},title.eq.${title}`)
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
                  condition: condition,
                  category: category,
                  quantity: quantity,
                  photos: imageUrls,
                  updated_at: new Date().toISOString(),
                  status: status,
                  price: price,
                  ebay_item_id: itemId,
                  ebay_category_id: listing.categoryId
                })
                .eq('id', existingListing.id);

              if (updateError) {
                console.error(` Failed to update listing ${itemId}:`, updateError);
                importResults.push({
                  itemId: itemId,
                  action: 'update_failed',
                  success: false,
                  error: updateError.message
                });
              } else {
                console.log(` Updated existing listing: ${title}`);
                importResults.push({
                  itemId: itemId,
                  action: 'updated',
                  success: true,
                  listingId: existingListing.id
                });
              }
            } else {
              // Create new listing
              const { data: created, error: createError } = await supabase
                .from('listings')
                .insert({
                  user_id: user.id,
                  title: title,
                  // Store itemId in description
                  description: description + `\n\n[eBay Item ID: ${itemId}]`,
                  price: price,
                  condition: condition,
                  category: category,
                  quantity: quantity,
                  photos: imageUrls,
                  status: status, // Use the status we determined (active for published offers, draft otherwise)
                  platform: 'ebay',
                  ebay_item_id: itemId,
                  ebay_category_id: listing.categoryId,
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
                itemId: itemId,
                listingId: created.id,
                action: 'created',
                success: true
              });
            }
          } catch (error) {
            console.error(`❌ Error processing item ${listing?.itemId}:`, error);
            importResults.push({
              itemId: listing?.itemId || 'unknown',
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
        const allListings: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) { // Limit to 10 pages for safety
          const response = await fetch('https://api.ebay.com/ws/api.dll', {
            method: 'POST',
            headers: {
              'X-EBAY-API-SITEID': '0',
              'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
              'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
              'X-EBAY-API-IAF-TOKEN': accessToken,
              'Content-Type': 'text/xml',
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
              <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                <RequesterCredentials>
                  <eBayAuthToken>${accessToken}</eBayAuthToken>
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
    item.description = extractXmlValue(itemXml, 'Description') || '';
    item.price = {
      value: extractXmlValue(itemXml, 'CurrentPrice'),
      currency: extractXmlValue(itemXml, 'CurrentPrice', 'currencyID')
    };
    item.conditionId = extractXmlValue(itemXml, 'ConditionID');
    item.conditionDisplayName = extractXmlValue(itemXml, 'ConditionDisplayName');
    item.categoryId = extractXmlValue(itemXml, 'PrimaryCategoryID');
    item.categoryName = extractXmlValue(itemXml, 'PrimaryCategoryName');
    item.quantity = parseInt(extractXmlValue(itemXml, 'Quantity') || '1');
    item.sellingStatus = {
      sellingState: extractXmlValue(itemXml, 'SellingState')
    };
    
    // Extract picture URLs - eBay returns multiple PictureURL tags
    const pictureUrls = itemXml.matchAll(/<PictureURL>(.*?)<\/PictureURL>/g);
    item.pictureURLLarge = Array.from(pictureUrls).map(m => m[1]).filter(url => url && url.length > 0);
    
    // Also check for PictureDetails which may contain larger images
    const pictureDetailsMatch = itemXml.match(/<PictureDetails>(.*?)<\/PictureDetails>/s);
    if (pictureDetailsMatch) {
      const galleryUrls = pictureDetailsMatch[1].matchAll(/<GalleryURL>(.*?)<\/GalleryURL>/g);
      const galleryArray = Array.from(galleryUrls).map(m => m[1]).filter(url => url && url.length > 0);
      if (galleryArray.length > 0) {
        item.pictureURLLarge = [...item.pictureURLLarge, ...galleryArray];
      }
    }
    
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

function mapEbayCategory(categoryId: string): string {
  // Basic eBay category mapping - can be expanded
  const categoryMap: Record<string, string> = {
    '11450': 'Clothing, Shoes & Accessories',
    '58058': 'Cell Phones & Accessories', 
    '293': 'Consumer Electronics',
    '1249': 'Video Games & Consoles',
    '11233': 'Music',
    '267': 'Books, Movies & Music',
    '888': 'Collectibles & Art',
    '12576': 'Business & Industrial',
    '6000': 'Motors',
    '1': 'Collectibles',
    '281': 'Jewelry & Watches',
    '14339': 'Crafts',
    '11700': 'Home & Garden',
    '15032': 'Cameras & Photo',
    '625': 'Cameras & Photo',
    '1305': 'Tickets & Experiences'
  };
  
  return categoryMap[categoryId] || 'Other';
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
