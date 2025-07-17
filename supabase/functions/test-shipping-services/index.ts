import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[TEST-SHIPPING] 🚀 Testing eBay shipping services fetcher');

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid auth token');
    }

    console.log('[TEST-SHIPPING] 📋 User authenticated:', { userId: user.id });

    // Call the shipping services fetcher with force refresh
    const response = await supabase.functions.invoke('ebay-shipping-services-fetcher', {
      body: { 
        userId: user.id, 
        forceRefresh: true 
      }
    });

    console.log('[TEST-SHIPPING] 📡 Fetcher response:', JSON.stringify(response, null, 2));

    if (response.error) {
      throw new Error(`Fetcher failed: ${response.error.message}`);
    }

    // Check what services were stored in the database
    const { data: storedServices, error: dbError } = await supabase
      .from('ebay_valid_services')
      .select('*')
      .order('service_name');

    console.log('[TEST-SHIPPING] 💾 Services in database:', {
      count: storedServices?.length || 0,
      services: storedServices?.map(s => ({
        code: s.service_code,
        name: s.service_name,
        domestic: s.is_domestic,
        account_type: s.account_type
      })) || []
    });

    return new Response(JSON.stringify({
      success: true,
      fetcherResponse: response.data,
      databaseServices: storedServices,
      message: 'Shipping services fetched and stored successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[TEST-SHIPPING] ❌ Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});