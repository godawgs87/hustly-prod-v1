import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY-LOCATION] ${step}${detailsStr}`);
};

// eBay Inventory Location API Integration
class EbayInventoryLocationAPI {
  private accessToken: string = '';
  private baseUrl: string = 'https://api.ebay.com';
  private clientId: string;
  private clientSecret: string;
  private supabaseClient: any;
  private userId: string;

  constructor(supabaseClient: any, userId: string) {
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  // Centralized header utility for eBay API requests
  private ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US'); // Required by eBay - prevents Accept-Language errors
    headers.set('Accept-Language', 'en-US'); // Override runtime auto-injection to prevent eBay rejection
    return headers;
  }

  async ensureValidToken(): Promise<string> {
    // Get the current marketplace account
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('*')
      .eq('platform', 'ebay')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      throw new Error('No active eBay account found. Please connect your eBay account first.');
    }

    // Check if token is expired or expires soon (within 30 minutes)
    const expiryTime = new Date(account.oauth_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (timeUntilExpiry <= thirtyMinutes) {
      logStep('Token expired or expires soon, refreshing', { 
        expiresAt: account.oauth_expires_at,
        timeUntilExpiry: Math.floor(timeUntilExpiry / 1000 / 60) + ' minutes'
      });

      // Attempt to refresh token
      const { data: refreshResult, error: refreshError } = await this.supabaseClient.functions.invoke('ebay-token-refresh', {
        body: { accountId: account.id, forceRefresh: true }
      });

      if (refreshError || refreshResult?.status !== 'completed') {
        throw new Error(`Token refresh failed: ${refreshError?.message || 'Unknown error'}`);
      }

      // Get the updated token
      const { data: updatedAccount, error: fetchError } = await this.supabaseClient
        .from('marketplace_accounts')
        .select('oauth_token')
        .eq('id', account.id)
        .single();

      if (fetchError || !updatedAccount?.oauth_token) {
        throw new Error('Failed to get refreshed token from database');
      }

      this.accessToken = updatedAccount.oauth_token;
      logStep('Token refreshed successfully');
    } else {
      this.accessToken = account.oauth_token;
      logStep('Using existing valid token');
    }

    return this.accessToken;
  }

  async getInventoryLocations(): Promise<any[]> {
    await this.ensureValidToken();

    logStep('Fetching inventory locations from eBay');

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/location`, {
      method: 'GET',
      headers: this.ebayHeaders(this.accessToken)
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Failed to fetch inventory locations', { error, status: response.status });
      throw new Error(`Failed to fetch inventory locations: ${error}`);
    }

    const data = await response.json();
    logStep('Inventory locations fetched successfully', { count: data.locations?.length || 0 });
    return data.locations || [];
  }

  async createInventoryLocation(userProfile: any): Promise<string> {
    await this.ensureValidToken();

    const locationKey = `${userProfile.store_name || 'main'}_warehouse`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const locationData = {
      location: {
        address: {
          addressLine1: userProfile.inventory_address_line1 || userProfile.shipping_address_line1 || '123 Main St',
          addressLine2: userProfile.inventory_address_line2 || userProfile.shipping_address_line2 || null,
          city: userProfile.inventory_city || userProfile.shipping_city || 'Anytown',
          stateOrProvince: userProfile.inventory_state || userProfile.shipping_state || 'CA',
          postalCode: userProfile.inventory_postal_code || userProfile.shipping_postal_code || '12345',
          country: userProfile.inventory_country || userProfile.shipping_country || 'US'
        }
      },
      locationInstructions: 'Primary inventory location for online sales',
      name: userProfile.inventory_location_name || `${userProfile.store_name || 'Main'} Warehouse`,
      merchantLocationStatus: 'ENABLED',
      locationTypes: ['WAREHOUSE']
    };

    logStep('Creating inventory location', { locationKey, name: locationData.name });

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/location/${locationKey}`, {
      method: 'POST',
      headers: this.ebayHeaders(this.accessToken),
      body: JSON.stringify(locationData)
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Inventory location creation failed', { error, status: response.status });
      
      // Check if location already exists
      if (response.status === 409 || error.includes('already exists')) {
        logStep('Location already exists, returning existing key', { locationKey });
        return locationKey;
      }
      
      throw new Error(`Failed to create inventory location: ${error}`);
    }

    logStep('Inventory location created successfully', { locationKey });
    return locationKey;
  }

  async ensureDefaultLocation(userProfile: any): Promise<string> {
    try {
      // First, check existing locations
      const locations = await this.getInventoryLocations();
      
      if (locations && locations.length > 0) {
        const primaryLocation = locations.find(loc => 
          loc.merchantLocationStatus === 'ENABLED' && 
          loc.locationTypes?.includes('WAREHOUSE')
        ) || locations[0];
        
        logStep('Found existing inventory location', { 
          locationKey: primaryLocation.merchantLocationKey,
          name: primaryLocation.name 
        });
        
        return primaryLocation.merchantLocationKey;
      }
      
      // Create default location if none exists
      logStep('No inventory locations found, creating default');
      return await this.createInventoryLocation(userProfile);
      
    } catch (error: any) {
      logStep('Error ensuring default location', { error: error.message });
      
      // Fallback to a standard location key if all else fails
      const fallbackKey = 'main_warehouse';
      logStep('Using fallback location key', { fallbackKey });
      return fallbackKey;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay inventory location manager started");

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
    const { action = 'ensure_default' } = requestData;

    logStep("Processing inventory location request", { userId: user.id, action });

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    const locationApi = new EbayInventoryLocationAPI(supabaseClient, user.id);

    if (action === 'list') {
      // List all inventory locations
      const locations = await locationApi.getInventoryLocations();
      
      return new Response(JSON.stringify({
        status: 'success',
        locations: locations,
        count: locations.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'create') {
      // Create a new inventory location
      const locationKey = await locationApi.createInventoryLocation(userProfile);
      
      // Update user profile with the location
      await supabaseClient
        .from('user_profiles')
        .update({
          inventory_location_name: locationKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      return new Response(JSON.stringify({
        status: 'success',
        location_key: locationKey,
        message: 'Inventory location created successfully'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'ensure_default') {
      // Ensure a default location exists
      const locationKey = await locationApi.ensureDefaultLocation(userProfile);
      
      // Update user profile with the location if it's not already set
      if (!userProfile.inventory_location_name || userProfile.inventory_location_name !== locationKey) {
        await supabaseClient
          .from('user_profiles')
          .update({
            inventory_location_name: locationKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
      
      return new Response(JSON.stringify({
        status: 'success',
        location_key: locationKey,
        message: 'Default inventory location ensured'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);

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