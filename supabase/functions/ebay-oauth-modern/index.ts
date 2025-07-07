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
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ebay-oauth-modern/callback`;
    
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
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ebay-oauth-modern/callback`;
    
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Modern eBay OAuth function started");

    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');

    if (!ebayClientId || !ebayClientSecret) {
      throw new Error('eBay OAuth credentials not configured');
    }

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

    const { action, ...params } = await req.json();
    logStep("Processing OAuth action", { action });

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
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});