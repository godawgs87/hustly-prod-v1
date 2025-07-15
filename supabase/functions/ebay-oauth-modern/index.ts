import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-OAUTH-MODERN] ${step}${detailsStr}`);
};

// Modern eBay OAuth 2.0 Implementation (No Trading API)
class EbayModernOAuth {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = 'https://api.ebay.com';
  private sandboxBaseUrl: string = 'https://api.sandbox.ebay.com';
  private supabaseClient: any;

  constructor(clientId: string, clientSecret: string, supabaseClient: any) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.supabaseClient = supabaseClient;
  }

  async getAuthUrl(state: string, scopes: string[] = ['https://api.ebay.com/oauth/api_scope', 'https://api.ebay.com/oauth/api_scope/sell.inventory']): Promise<string> {
    // Use frontend URL for OAuth callback
    const redirectUri = `https://preview--hustly-mvp3.lovable.app/ebay/callback`;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: scopes.join(' ')
    });

    const authUrl = `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;
    
    logStep('Generated OAuth URL', { authUrl: authUrl.substring(0, 100) + '...' });
    return authUrl;
  }

  async exchangeCodeForToken(code: string, userId: string): Promise<any> {
    // Use same redirect URI as in OAuth URL generation
    const redirectUri = `https://preview--hustly-mvp3.lovable.app/ebay/callback`;
    
    const tokenEndpoint = 'https://api.ebay.com/identity/v1/oauth2/token';
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    logStep('Exchanging code for token', { code: code.substring(0, 10) + '...' });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Token exchange failed', { status: response.status, error });
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await response.json();
    logStep('Token exchange successful', { 
      access_token: tokenData.access_token?.substring(0, 20) + '...',
      expires_in: tokenData.expires_in 
    });

    // Save to database
    await this.saveTokenToDatabase(userId, tokenData);
    
    return tokenData;
  }

  async refreshAccessToken(refreshToken: string, userId: string): Promise<any> {
    const tokenEndpoint = 'https://api.ebay.com/identity/v1/oauth2/token';
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    logStep('Refreshing access token');

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Token refresh failed', { status: response.status, error });
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData = await response.json();
    logStep('Token refresh successful');

    // Update database
    await this.updateTokenInDatabase(userId, tokenData);
    
    return tokenData;
  }

  private async saveTokenToDatabase(userId: string, tokenData: any) {
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const accountData = {
      user_id: userId,
      platform: 'ebay',
      account_username: 'eBay User', // Will be updated when we get user info
      is_connected: true,
      is_active: true,
      oauth_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      oauth_expires_at: expiresAt,
      account_id: `ebay_modern_${userId}`,
      seller_level: 'standard',
      api_permissions: ['read', 'write', 'sell.inventory'],
      last_sync_at: new Date().toISOString(),
      platform_settings: {
        token_type: 'oauth2',
        scope: tokenData.scope || 'https://api.ebay.com/oauth/api_scope',
        auth_method: 'modern_oauth'
      }
    };

    const { error } = await this.supabaseClient
      .from('marketplace_accounts')
      .upsert(accountData, { onConflict: 'user_id,platform' });

    if (error) {
      throw new Error(`Failed to save eBay account: ${error.message}`);
    }

    logStep('Account saved to database');
  }

  private async updateTokenInDatabase(userId: string, tokenData: any) {
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const { error } = await this.supabaseClient
      .from('marketplace_accounts')
      .update({
        oauth_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        oauth_expires_at: expiresAt,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('platform', 'ebay');

    if (error) {
      throw new Error(`Failed to update eBay token: ${error.message}`);
    }

    logStep('Token updated in database');
  }
}

// Health check endpoint
const handleHealthCheck = () => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasEbayClientId: !!Deno.env.get('EBAY_CLIENT_ID'),
      hasEbayClientSecret: !!Deno.env.get('EBAY_CLIENT_SECRET'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    }
  }
  
  logStep('Health check', health)
  
  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.url.includes('/health')) {
    return handleHealthCheck()
  }

  try {
    logStep("Modern eBay OAuth function started", { method: req.method, url: req.url });

    // Enhanced environment variable checking
    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    logStep("Environment check", { 
      hasEbayId: !!ebayClientId,
      hasEbaySecret: !!ebayClientSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      ebayIdLength: ebayClientId?.length || 0
    });

    if (!ebayClientId || !ebayClientSecret) {
      const errorMsg = `Missing eBay credentials: ${!ebayClientId ? 'CLIENT_ID' : ''} ${!ebayClientSecret ? 'CLIENT_SECRET' : ''}`.trim();
      logStep("ERROR: Missing credentials", { error: errorMsg });
      throw new Error(errorMsg);
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Missing Supabase configuration';
      logStep("ERROR: Missing Supabase config", { error: errorMsg });
      throw new Error(errorMsg);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    // Enhanced auth header validation
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { 
      hasAuthHeader: !!authHeader,
      headerLength: authHeader?.length || 0,
      headerPrefix: authHeader?.substring(0, 10) || 'none'
    });

    if (!authHeader) {
      const errorMsg = "Missing Authorization header - ensure user is logged in";
      logStep("ERROR: No auth header", { error: errorMsg });
      throw new Error(errorMsg);
    }

    if (!authHeader.startsWith('Bearer ')) {
      const errorMsg = "Invalid Authorization header format - must start with 'Bearer '";
      logStep("ERROR: Invalid auth format", { error: errorMsg });
      throw new Error(errorMsg);
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 10) {
      const errorMsg = "Invalid or empty auth token";
      logStep("ERROR: Invalid token", { tokenLength: token?.length || 0 });
      throw new Error(errorMsg);
    }

    logStep("Authenticating user", { tokenLength: token.length });
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      const errorMsg = `Authentication failed: ${userError.message}`;
      logStep("ERROR: Auth failed", { error: errorMsg });
      throw new Error(errorMsg);
    }
    
    const user = userData.user;
    if (!user?.id) {
      const errorMsg = "No user found in token";
      logStep("ERROR: No user", { userData: !!userData });
      throw new Error(errorMsg);
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body - supabase.functions.invoke() sends JSON
    let requestBody: any = {};
    
    try {
      requestBody = await req.json();
      logStep("Successfully parsed JSON", { keys: Object.keys(requestBody || {}) });
    } catch (parseError) {
      const errorMsg = "Failed to parse JSON request body";
      logStep("ERROR", { message: errorMsg, error: parseError });
      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: "Ensure you're sending a valid JSON body with an 'action' parameter"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { action, ...params } = requestBody;
    if (!action) {
      const errorMsg = "Missing 'action' parameter in request body";
      logStep("ERROR", { message: errorMsg, receivedParams: Object.keys(requestBody) });
      return new Response(JSON.stringify({ 
        error: errorMsg,
        received: Object.keys(requestBody),
        expected: "action parameter is required"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Processing OAuth action", { action, paramsCount: Object.keys(params).length });

    const oauthClient = new EbayModernOAuth(ebayClientId, ebayClientSecret, supabaseClient);

    switch (action) {
      case 'get_auth_url':
        const authUrl = await oauthClient.getAuthUrl(params.state || 'ebay_oauth');
        return new Response(JSON.stringify({
          status: 'success',
          auth_url: authUrl
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      
      case 'exchange_code':
        const tokenData = await oauthClient.exchangeCodeForToken(params.code, user.id);
        return new Response(JSON.stringify({
          status: 'success',
          message: 'eBay account connected successfully',
          account: {
            platform: 'ebay',
            connected: true,
            tokenType: 'oauth2'
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      
      case 'refresh_token':
        const refreshedToken = await oauthClient.refreshAccessToken(params.refresh_token, user.id);
        return new Response(JSON.stringify({
          status: 'success',
          message: 'Token refreshed successfully'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Determine appropriate error status
    let statusCode = 500;
    if (errorMessage.includes('Authentication') || errorMessage.includes('Authorization')) {
      statusCode = 401;
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Invalid')) {
      statusCode = 400;
    } else if (errorMessage.includes('Missing')) {
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      function: 'ebay-oauth-modern'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});