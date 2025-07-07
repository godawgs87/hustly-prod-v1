import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-API-CLIENT] ${step}${detailsStr}`);
};

// Centralized eBay API Client
export class EbayAPIClient {
  private accessToken: string = '';
  baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private supabaseClient: any;
  private userId: string;

  constructor(isSandbox: boolean = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  // Centralized header utility
  ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
    return headers;
  }

  async ensureValidToken(): Promise<string> {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('*')
      .eq('platform', 'ebay')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      throw new Error('No active eBay account found');
    }

    const expiryTime = new Date(account.oauth_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (timeUntilExpiry <= thirtyMinutes) {
      logStep('Token expired, refreshing');
      return await this.refreshToken(account);
    }

    this.accessToken = account.oauth_token;
    return this.accessToken;
  }

  private async refreshToken(account: any): Promise<string> {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${account.refresh_token}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account`
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    await this.supabaseClient
      .from('marketplace_accounts')
      .update({
        oauth_token: tokenData.access_token,
        oauth_expires_at: expiresAt.toISOString(),
        refresh_token: tokenData.refresh_token || account.refresh_token,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    this.accessToken = tokenData.access_token;
    return this.accessToken;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.ensureValidToken();
    const headers = this.ebayHeaders(token);
    
    // Merge with any existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => headers.set(key, value));
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      throw new Error(`eBay API Error: ${JSON.stringify(errorDetails)}`);
    }

    return await response.json();
  }
}

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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const requestData = await req.json();
    const { action, ...params } = requestData;

    const ebayClient = new EbayAPIClient(false, supabaseClient, user.id);

    switch (action) {
      case 'test_connection':
        await ebayClient.ensureValidToken();
        return new Response(JSON.stringify({ status: 'success', message: 'eBay connection valid' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'make_request':
        const result = await ebayClient.makeRequest(params.endpoint, params.options);
        return new Response(JSON.stringify({ status: 'success', data: result }), {
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