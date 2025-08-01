import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-OAUTH] ${step}${detailsStr}`);
};

// eBay OAuth configuration
const EBAY_CONFIG = {
  clientId: Deno.env.get('EBAY_CLIENT_ID') || '',
  clientSecret: Deno.env.get('EBAY_CLIENT_SECRET') || '',
  sandbox: Deno.env.get('EBAY_SANDBOX') === 'true',
  getRedirectUri(frontendOrigin?: string) {
    // Fully automatic redirect URI - frontend passes its current origin
    if (frontendOrigin) {
      return `${frontendOrigin}/ebay/callback`;
    }
    
    // Fallback to environment variable
    const customRedirectUri = Deno.env.get('EBAY_REDIRECT_URI');
    if (customRedirectUri) {
      return customRedirectUri;
    }
    
    // Final fallback to localhost with dynamic port detection
    const port = Deno.env.get('PORT') || '8086';
    return `http://localhost:${port}/ebay/callback`;
  },
  get baseUrl() {
    return this.sandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  },
  get authUrl() {
    return this.sandbox ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com';
  }
};

const REQUIRED_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/buy.browse'  // Required for price research
].join(' ');

serve(async (req) => {
  console.log('=== EBAY OAUTH FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Reading request body...');
    
    // Handle different content types and empty bodies
    let requestData;
    try {
      const body = await req.text();
      console.log('Raw body text:', body);
      
      if (!body || body.trim() === '') {
        console.error('Empty request body received');
        return new Response(JSON.stringify({
          error: 'Empty request body',
          details: 'No data received in request body'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      requestData = JSON.parse(body);
      console.log('Parsed request data:', requestData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { action, code, state, origin, redirect_origin } = requestData;
    const frontendOrigin = origin || redirect_origin;
    console.log('Action:', action, 'Code present:', !!code, 'State:', state);

    // Add comprehensive debug action
    if (action === 'test') {
      console.log('✅ Test action - function is working correctly');
      return new Response(JSON.stringify({
        success: true,
        message: 'eBay OAuth function is working',
        timestamp: new Date().toISOString(),
        environment: {
          clientId: !!EBAY_CONFIG.clientId,
          clientSecret: !!EBAY_CONFIG.clientSecret,
          sandbox: EBAY_CONFIG.sandbox
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'debug') {
      console.log('Debug action - checking environment');
      const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
      const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
      console.log('Client ID present:', !!ebayClientId);
      console.log('Client Secret present:', !!ebayClientSecret);
      
      return new Response(JSON.stringify({
        status: 'ok',
        config: {
          clientId: ebayClientId ? 'configured' : 'missing',
          clientSecret: ebayClientSecret ? 'configured' : 'missing'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_auth_url') {
      console.log('✅ Get auth URL action - generating eBay OAuth URL');
      
      if (!EBAY_CONFIG.clientId) {
        console.error('eBay Client ID not configured');
        return new Response(JSON.stringify({
          error: 'eBay Client ID not configured'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }

      // Generate OAuth authorization URL
      const authUrl = `${EBAY_CONFIG.authUrl}/oauth2/authorize?` + 
        `client_id=${EBAY_CONFIG.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(EBAY_CONFIG.getRedirectUri(frontendOrigin))}&` +
        `scope=${encodeURIComponent(REQUIRED_SCOPES)}&` +
        `state=${state || 'ebay_oauth'}`;

      console.log('Generated auth URL:', authUrl);
      
      return new Response(JSON.stringify({
        auth_url: authUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'exchange_code') {
      console.log('=== TOKEN EXCHANGE START ===');
      const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
      const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
      
      console.log('Credentials check - Client ID:', !!ebayClientId, 'Secret:', !!ebayClientSecret, 'Code:', !!code);

      if (!ebayClientId || !ebayClientSecret || !code) {
        console.error('Missing credentials or code');
        return new Response(JSON.stringify({
          error: 'Missing credentials or code',
          details: {
            clientId: !!ebayClientId,
            clientSecret: !!ebayClientSecret,
            code: !!code
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      console.log('Making eBay token request...');
      
      try {
        const tokenResponse = await fetch(`${EBAY_CONFIG.baseUrl}/identity/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${EBAY_CONFIG.clientId}:${EBAY_CONFIG.clientSecret}`)}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: EBAY_CONFIG.getRedirectUri(frontendOrigin)
          })
        });

        console.log('eBay response status:', tokenResponse.status);
        
        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('eBay error response:', error);
          return new Response(JSON.stringify({
            error: 'Token exchange failed',
            details: error
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }

        const tokenData = await tokenResponse.json();
        console.log('eBay token data received, access_token present:', !!tokenData.access_token);

        // Store in database with CORRECT schema fields
        console.log('Creating Supabase client...');
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '', 
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const authHeader = req.headers.get('authorization');
        console.log('Auth header present:', !!authHeader);
        
        if (!authHeader) {
          console.error('No auth header provided');
          return new Response(JSON.stringify({
            error: 'No auth header'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          });
        }

        console.log('Getting user from auth header...');
        const { data: { user }, error: userError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        
        console.log('User lookup result - User found:', !!user, 'Error:', userError?.message);
        
        if (userError || !user) {
          console.error('User authentication failed:', userError);
          return new Response(JSON.stringify({
            error: 'User not found or authentication failed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          });
        }

        console.log('Storing marketplace account for user:', user.id);
        
        // Calculate expiration time - eBay user tokens should last 180 days
        // Use tokenData.expires_in if provided, otherwise default to 180 days (15552000 seconds)
        const expiresIn = tokenData.expires_in || (180 * 24 * 60 * 60); // 180 days in seconds
        const expirationTime = new Date(Date.now() + expiresIn * 1000);
        
        console.log('Token expiration info:', {
          provided_expires_in: tokenData.expires_in,
          using_expires_in: expiresIn,
          expiration_time: expirationTime.toISOString(),
          days_from_now: Math.round(expiresIn / (24 * 60 * 60))
        });

        // Use a simple username for now to avoid timeouts
        const realUsername = `ebay_user_${Date.now()}`;
        console.log('Using generated username:', realUsername);

        // ✅ CORRECT database fields with real user data
        const marketplaceAccountData = {
          user_id: user.id,
          platform: 'ebay',
          account_username: realUsername,
          oauth_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          oauth_expires_at: expirationTime.toISOString(),
          token_expires_at: expirationTime.toISOString(),
          is_connected: true,
          is_active: true,  // ✅ Make sure this is set to true
          platform_settings: {
            sandbox: EBAY_CONFIG.sandbox,
            scopes: REQUIRED_SCOPES.split(' '),
            token_type: tokenData.token_type || 'Bearer'
          }
        };

        console.log('Inserting marketplace account data...');
        
        const { data: accountData, error: dbError } = await supabase
          .from('marketplace_accounts')
          .upsert(marketplaceAccountData, {
            onConflict: 'user_id,platform'
          })
          .select()
          .single();

        console.log('Database operation result - Data:', !!accountData, 'Error:', dbError?.message);
        
        if (dbError) {
          console.error('Database error details:', dbError);
          return new Response(JSON.stringify({
            error: 'Failed to store account',
            details: dbError.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }

        console.log('eBay connection stored successfully');
        
        return new Response(JSON.stringify({
          success: true,
          message: 'eBay connected successfully',
          username: marketplaceAccountData.account_username,
          account: {
            id: accountData?.id,
            platform: 'ebay',
            username: marketplaceAccountData.account_username,
            connected_at: new Date().toISOString()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (fetchError) {
        console.error('Network error during eBay token exchange:', fetchError);
        return new Response(JSON.stringify({
          error: 'Network error during token exchange',
          details: fetchError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    console.log('Unknown action received:', action);
    return new Response(JSON.stringify({
      error: `Unknown action: ${action}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});