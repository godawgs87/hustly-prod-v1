import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-TOKEN-REFRESH] ${step}${detailsStr}`);
};

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

class EbayTokenManager {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
    this.baseUrl = 'https://api.ebay.com';
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('eBay credentials not configured');
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account`
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Token refresh failed', { status: response.status, error: errorText });
      throw new Error(`eBay token refresh failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    logStep('Token refreshed successfully', { expiresIn: data.expires_in });
    return data;
  }

  async checkTokenExpiry(tokenExpiresAt: string): Promise<boolean> {
    const expiryTime = new Date(tokenExpiresAt);
    const now = new Date();
    const bufferMinutes = 30; // Refresh 30 minutes before expiry
    
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const bufferTime = bufferMinutes * 60 * 1000;
    
    return timeUntilExpiry <= bufferTime;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay token refresh started");

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

    const requestData = await req.json().catch(() => ({}));
    const { forceRefresh = false, accountId } = requestData;

    logStep("Processing token refresh", { userId: user.id, forceRefresh, accountId });

    // Get eBay marketplace accounts
    let query = supabaseClient
      .from('marketplace_accounts')
      .select('*')
      .eq('platform', 'ebay')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError) {
      throw new Error(`Failed to fetch eBay accounts: ${accountError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({
        status: 'no_accounts',
        message: 'No active eBay accounts found'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const tokenManager = new EbayTokenManager();
    const refreshResults = [];

    for (const account of accounts) {
      try {
        logStep("Processing account", { accountId: account.id, username: account.account_username });

        if (!account.refresh_token) {
          logStep("No refresh token available", { accountId: account.id });
          refreshResults.push({
            accountId: account.id,
            status: 'no_refresh_token',
            message: 'No refresh token available - requires re-authentication'
          });
          continue;
        }

        // Check if token needs refresh
        const needsRefresh = forceRefresh || 
          !account.oauth_expires_at || 
          await tokenManager.checkTokenExpiry(account.oauth_expires_at);

        if (!needsRefresh) {
          logStep("Token still valid", { accountId: account.id });
          refreshResults.push({
            accountId: account.id,
            status: 'not_needed',
            message: 'Token is still valid'
          });
          continue;
        }

        // Refresh the token
        const tokenData = await tokenManager.refreshAccessToken(account.refresh_token);
        
        // Calculate new expiry time
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        // Update the account with new token
        const { error: updateError } = await supabaseClient
          .from('marketplace_accounts')
          .update({
            oauth_token: tokenData.access_token,
            oauth_expires_at: expiresAt.toISOString(),
            refresh_token: tokenData.refresh_token || account.refresh_token, // Keep existing if not provided
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);

        if (updateError) {
          throw new Error(`Failed to update account tokens: ${updateError.message}`);
        }

        logStep("Token refreshed successfully", { 
          accountId: account.id, 
          expiresAt: expiresAt.toISOString() 
        });

        refreshResults.push({
          accountId: account.id,
          status: 'success',
          message: 'Token refreshed successfully',
          expiresAt: expiresAt.toISOString()
        });

      } catch (error: any) {
        logStep("Token refresh failed for account", { 
          accountId: account.id, 
          error: error.message 
        });

        // If refresh token is invalid, mark account as needs re-auth
        if (error.message.includes('invalid_grant') || error.message.includes('refresh_token')) {
          await supabaseClient
            .from('marketplace_accounts')
            .update({
              is_connected: false,
              oauth_expires_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', account.id);
        }

        refreshResults.push({
          accountId: account.id,
          status: 'failed',
          message: error.message,
          requiresReauth: error.message.includes('invalid_grant') || error.message.includes('refresh_token')
        });
      }
    }

    logStep("Token refresh completed", { 
      totalAccounts: accounts.length,
      successCount: refreshResults.filter(r => r.status === 'success').length,
      failedCount: refreshResults.filter(r => r.status === 'failed').length
    });

    return new Response(JSON.stringify({
      status: 'completed',
      results: refreshResults,
      summary: {
        totalAccounts: accounts.length,
        successCount: refreshResults.filter(r => r.status === 'success').length,
        failedCount: refreshResults.filter(r => r.status === 'failed').length,
        notNeededCount: refreshResults.filter(r => r.status === 'not_needed').length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      status: 'failed',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});