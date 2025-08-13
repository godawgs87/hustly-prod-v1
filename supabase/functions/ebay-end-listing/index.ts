import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const { itemId, reason = 'NotAvailable' } = await req.json();
    
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    console.log('🗑️ Ending eBay listing:', itemId, 'Reason:', reason);

    // Get eBay OAuth token
    const { data: connection, error: connError } = await supabaseClient
      .from('platform_connections')
      .select('oauth_token')
      .eq('user_id', user.id)
      .eq('platform', 'ebay')
      .single();

    if (connError || !connection?.oauth_token) {
      throw new Error('eBay connection not found. Please reconnect your eBay account.');
    }

    // Use eBay Trading API to end the listing
    const ebayApiUrl = 'https://api.ebay.com/ws/api.dll';
    
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${connection.oauth_token}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <EndingReason>${reason}</EndingReason>
</EndItemRequest>`;

    const response = await fetch(ebayApiUrl, {
      method: 'POST',
      headers: {
        'X-EBAY-API-CALL-NAME': 'EndItem',
        'X-EBAY-API-SITEID': '0', // US site
        'X-EBAY-API-COMPATIBILITY-LEVEL': '1157',
        'X-EBAY-API-IAF-TOKEN': connection.oauth_token,
        'Content-Type': 'text/xml'
      },
      body: xmlRequest
    });

    const responseText = await response.text();
    console.log('eBay API Response:', responseText);

    // Check for success in the XML response
    if (responseText.includes('<Ack>Success</Ack>') || responseText.includes('<Ack>Warning</Ack>')) {
      // Also remove from platform_listings table
      await supabaseClient
        .from('platform_listings')
        .delete()
        .eq('platform_listing_id', itemId)
        .eq('platform', 'ebay');

      return new Response(JSON.stringify({
        success: true,
        message: 'Listing ended successfully on eBay'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Extract error message from XML if available
      const errorMatch = responseText.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
      const errorMessage = errorMatch ? errorMatch[1] : 'Failed to end eBay listing';
      
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Error ending eBay listing:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end eBay listing'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
