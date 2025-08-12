import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('🔧 [EBAY-CRUD] Action:', action, 'User:', user.id);

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

    switch (action) {
      case 'update_listing': {
        const { listingId, updates } = params;
        
        // Get listing from database
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (listingError || !listing) {
          throw new Error('Listing not found');
        }

        if (!listing.ebay_item_id) {
          throw new Error('Listing not synced to eBay');
        }

        console.log(`📝 Updating eBay listing ${listing.ebay_item_id}`);

        // Build ReviseItem request
        const reviseRequest = buildReviseItemRequest(listing.ebay_item_id, updates, account.access_token);

        const response = await fetch('https://api.ebay.com/ws/api.dll', {
          method: 'POST',
          headers: {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
            'X-EBAY-API-CALL-NAME': 'ReviseItem',
            'X-EBAY-API-IAF-TOKEN': account.access_token,
            'Content-Type': 'text/xml',
          },
          body: reviseRequest
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay ReviseItem Error:', error);
          throw new Error(`Failed to update eBay listing: ${response.statusText}`);
        }

        const xmlResponse = await response.text();
        const success = xmlResponse.includes('<Ack>Success</Ack>') || xmlResponse.includes('<Ack>Warning</Ack>');

        if (success) {
          // Update local database
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              ...updates,
              ebay_sync_status: 'synced',
              ebay_last_sync: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', listingId);

          if (updateError) {
            console.error('⚠️ Updated on eBay but failed to update local DB:', updateError);
          }

          console.log('✅ Successfully updated eBay listing');
          return new Response(JSON.stringify({
            success: true,
            message: 'Listing updated successfully',
            ebayItemId: listing.ebay_item_id
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error('eBay API returned failure');
        }
      }

      case 'end_listing': {
        const { listingId, reason = 'NotAvailable' } = params;
        
        // Get listing from database
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (listingError || !listing) {
          throw new Error('Listing not found');
        }

        if (!listing.ebay_item_id) {
          throw new Error('Listing not synced to eBay');
        }

        console.log(`🗑️ Ending eBay listing ${listing.ebay_item_id}`);

        const response = await fetch('https://api.ebay.com/ws/api.dll', {
          method: 'POST',
          headers: {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
            'X-EBAY-API-CALL-NAME': 'EndItem',
            'X-EBAY-API-IAF-TOKEN': account.access_token,
            'Content-Type': 'text/xml',
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
            <EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <RequesterCredentials>
                <eBayAuthToken>${account.access_token}</eBayAuthToken>
              </RequesterCredentials>
              <ItemID>${listing.ebay_item_id}</ItemID>
              <EndingReason>${reason}</EndingReason>
            </EndItemRequest>`
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay EndItem Error:', error);
          throw new Error(`Failed to end eBay listing: ${response.statusText}`);
        }

        const xmlResponse = await response.text();
        const success = xmlResponse.includes('<Ack>Success</Ack>') || xmlResponse.includes('<Ack>Warning</Ack>');

        if (success) {
          // Update local database
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              status: 'ended',
              ebay_sync_status: 'ended',
              ebay_last_sync: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', listingId);

          if (updateError) {
            console.error('⚠️ Ended on eBay but failed to update local DB:', updateError);
          }

          console.log('✅ Successfully ended eBay listing');
          return new Response(JSON.stringify({
            success: true,
            message: 'Listing ended successfully',
            ebayItemId: listing.ebay_item_id
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          throw new Error('eBay API returned failure');
        }
      }

      case 'get_listing_status': {
        const { listingId } = params;
        
        // Get listing from database
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (listingError || !listing) {
          throw new Error('Listing not found');
        }

        if (!listing.ebay_item_id) {
          return new Response(JSON.stringify({
            success: true,
            status: 'not_synced',
            listing: listing
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`🔍 Checking status for eBay listing ${listing.ebay_item_id}`);

        const response = await fetch('https://api.ebay.com/ws/api.dll', {
          method: 'POST',
          headers: {
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
            'X-EBAY-API-CALL-NAME': 'GetItem',
            'X-EBAY-API-IAF-TOKEN': account.access_token,
            'Content-Type': 'text/xml',
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
            <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <RequesterCredentials>
                <eBayAuthToken>${account.access_token}</eBayAuthToken>
              </RequesterCredentials>
              <ItemID>${listing.ebay_item_id}</ItemID>
              <DetailLevel>ReturnAll</DetailLevel>
            </GetItemRequest>`
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('❌ eBay GetItem Error:', error);
          
          // Check if item not found
          if (error.includes('Invalid item ID') || error.includes('Item not found')) {
            return new Response(JSON.stringify({
              success: true,
              status: 'not_found',
              message: 'Item not found on eBay'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error(`Failed to get eBay listing status: ${response.statusText}`);
        }

        const xmlResponse = await response.text();
        
        // Parse status from XML
        const sellingStatus = extractXmlValue(xmlResponse, 'SellingStatus');
        const listingStatus = extractXmlValue(xmlResponse, 'ListingStatus');
        const quantitySold = extractXmlValue(xmlResponse, 'QuantitySold');
        const quantityAvailable = extractXmlValue(xmlResponse, 'QuantityAvailable');
        const currentPrice = extractXmlValue(xmlResponse, 'CurrentPrice');
        const bidCount = extractXmlValue(xmlResponse, 'BidCount');
        const watchCount = extractXmlValue(xmlResponse, 'WatchCount');

        const status = {
          listingStatus: listingStatus,
          sellingStatus: sellingStatus,
          quantitySold: parseInt(quantitySold || '0'),
          quantityAvailable: parseInt(quantityAvailable || '0'),
          currentPrice: parseFloat(currentPrice || '0'),
          bidCount: parseInt(bidCount || '0'),
          watchCount: parseInt(watchCount || '0'),
          isActive: listingStatus === 'Active',
          isSold: parseInt(quantitySold || '0') > 0 && parseInt(quantityAvailable || '0') === 0
        };

        // Update local database with latest status
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            status: status.isSold ? 'sold' : (status.isActive ? 'active' : 'ended'),
            quantity: status.quantityAvailable,
            ebay_sync_status: 'synced',
            ebay_last_sync: new Date().toISOString()
          })
          .eq('id', listingId);

        console.log('✅ Successfully retrieved eBay listing status');
        return new Response(JSON.stringify({
          success: true,
          ebayItemId: listing.ebay_item_id,
          status: status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bulk_status_check': {
        const { listingIds } = params;
        
        if (!listingIds || !Array.isArray(listingIds)) {
          throw new Error('No listing IDs provided');
        }

        console.log(`🔍 Checking status for ${listingIds.length} listings`);
        
        const results = [];
        
        for (const listingId of listingIds) {
          try {
            // Get listing from database
            const { data: listing } = await supabase
              .from('listings')
              .select('id, ebay_item_id')
              .eq('id', listingId)
              .eq('user_id', user.id)
              .single();

            if (!listing || !listing.ebay_item_id) {
              results.push({
                listingId,
                status: 'not_synced',
                success: false
              });
              continue;
            }

            // Check eBay status (simplified for bulk - could be optimized)
            const response = await fetch('https://api.ebay.com/ws/api.dll', {
              method: 'POST',
              headers: {
                'X-EBAY-API-SITEID': '0',
                'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
                'X-EBAY-API-CALL-NAME': 'GetItem',
                'X-EBAY-API-IAF-TOKEN': account.access_token,
                'Content-Type': 'text/xml',
              },
              body: `<?xml version="1.0" encoding="utf-8"?>
                <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
                  <RequesterCredentials>
                    <eBayAuthToken>${account.access_token}</eBayAuthToken>
                  </RequesterCredentials>
                  <ItemID>${listing.ebay_item_id}</ItemID>
                  <DetailLevel>ItemReturnDescription</DetailLevel>
                </GetItemRequest>`
            });

            if (response.ok) {
              const xmlResponse = await response.text();
              const listingStatus = extractXmlValue(xmlResponse, 'ListingStatus');
              const quantitySold = extractXmlValue(xmlResponse, 'QuantitySold');
              
              results.push({
                listingId,
                ebayItemId: listing.ebay_item_id,
                status: listingStatus,
                quantitySold: parseInt(quantitySold || '0'),
                success: true
              });
            } else {
              results.push({
                listingId,
                ebayItemId: listing.ebay_item_id,
                status: 'error',
                success: false
              });
            }
          } catch (error) {
            results.push({
              listingId,
              status: 'error',
              error: error.message,
              success: false
            });
          }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Checked ${successCount}/${listingIds.length} listings`);

        return new Response(JSON.stringify({
          success: true,
          checked: successCount,
          failed: listingIds.length - successCount,
          results: results
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

// Helper function to build ReviseItem XML request
function buildReviseItemRequest(itemId: string, updates: any, token: string): string {
  let reviseFields = '';
  
  if (updates.title) {
    reviseFields += `<Title>${escapeXml(updates.title)}</Title>`;
  }
  
  if (updates.price) {
    reviseFields += `<StartPrice currencyID="USD">${updates.price}</StartPrice>`;
  }
  
  if (updates.quantity) {
    reviseFields += `<Quantity>${updates.quantity}</Quantity>`;
  }
  
  if (updates.description) {
    reviseFields += `<Description>${escapeXml(updates.description)}</Description>`;
  }
  
  if (updates.condition) {
    const conditionId = mapConditionToEbay(updates.condition);
    reviseFields += `<ConditionID>${conditionId}</ConditionID>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
    <ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${token}</eBayAuthToken>
      </RequesterCredentials>
      <Item>
        <ItemID>${itemId}</ItemID>
        ${reviseFields}
      </Item>
    </ReviseItemRequest>`;
}

// Helper function to extract XML values
function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to map condition to eBay condition ID
function mapConditionToEbay(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': '1000',
    'new_other': '1500',
    'new_with_defects': '1750',
    'manufacturer_refurbished': '2000',
    'seller_refurbished': '2500',
    'used_excellent': '3000',
    'used_very_good': '4000',
    'used_good': '5000',
    'used_acceptable': '6000',
    'for_parts': '7000'
  };
  
  return conditionMap[condition] || '3000';
}
