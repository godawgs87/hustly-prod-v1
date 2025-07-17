import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { EbayInventoryItemManager } from './ebay-inventory-item-manager.ts';
import { EbayOfferManager } from './ebay-offer-manager.ts';
import { EbayShippingServices } from './ebay-shipping-services.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY-SYNC] ${step}${detailsStr}`);
};

// eBay Inventory API Integration with Token Refresh and Modular Components
// Version: 2.0 - Refactored with modular architecture
class EbayInventoryAPI {
  private accessToken: string = '';
  baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private supabaseClient: any;
  private userId: string;
  private inventoryItemManager: EbayInventoryItemManager;
  private offerManager: EbayOfferManager;

  constructor(isSandbox: boolean = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
    
    // Initialize modular managers
    this.inventoryItemManager = new EbayInventoryItemManager(this.baseUrl, supabaseClient, userId);
    this.offerManager = new EbayOfferManager(this.baseUrl, supabaseClient, userId);
  }

  // Centralized header utility for eBay API requests
  ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
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

      // Direct token refresh
      if (!account.refresh_token) {
        throw new Error('No refresh token available - requires re-authentication');
      }

      if (!this.clientId || !this.clientSecret) {
        throw new Error('eBay credentials not configured');
      }

      const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
      
      const refreshResponse = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${account.refresh_token}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account`
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        logStep('Token refresh failed', { status: refreshResponse.status, error: errorText });
        
        if (errorText.includes('invalid_grant') || errorText.includes('refresh_token')) {
          await this.supabaseClient
            .from('marketplace_accounts')
            .update({
              is_connected: false,
              oauth_expires_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', account.id);
        }
        
        throw new Error(`eBay token refresh failed: ${refreshResponse.statusText} - ${errorText}`);
      }

      const tokenData = await refreshResponse.json();
      logStep('Token refreshed successfully', { expiresIn: tokenData.expires_in });

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const { error: updateError } = await this.supabaseClient
        .from('marketplace_accounts')
        .update({
          oauth_token: tokenData.access_token,
          oauth_expires_at: expiresAt.toISOString(),
          refresh_token: tokenData.refresh_token || account.refresh_token,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        throw new Error(`Failed to update account tokens: ${updateError.message}`);
      }

      this.accessToken = tokenData.access_token;
      logStep('Token refreshed and stored successfully');
    } else {
      this.accessToken = account.oauth_token;
      logStep('Using existing valid token', { 
        expiresAt: account.oauth_expires_at,
        timeUntilExpiry: Math.floor(timeUntilExpiry / 1000 / 60) + ' minutes'
      });
    }

    return this.accessToken;
  }

  async getAccessToken(): Promise<string> {
    return await this.ensureValidToken();
  }

  // Inventory operations using modular managers
  async createInventoryItem(sku: string, itemData: any): Promise<void> {
    const token = await this.getAccessToken();
    return await this.inventoryItemManager.createInventoryItem(token, sku, itemData);
  }

  async getExistingOffers(sku: string): Promise<any[]> {
    const token = await this.getAccessToken();
    return await this.offerManager.getExistingOffers(token, sku);
  }

  async createOffer(offerData: any): Promise<string> {
    const token = await this.getAccessToken();
    return await this.offerManager.createOffer(token, offerData);
  }

  async publishOffer(offerId: string): Promise<string> {
    const token = await this.getAccessToken();
    return await this.offerManager.publishOffer(token, offerId);
  }

  async deleteOffer(offerId: string): Promise<void> {
    const token = await this.getAccessToken();
    return await this.offerManager.deleteOffer(token, offerId);
  }

  async handleExistingOffers(sku: string): Promise<{ offerId?: string; shouldCreateNew: boolean; alreadyPublished?: { listingId: string; offerId: string } }> {
    const token = await this.getAccessToken();
    return await this.offerManager.handleExistingOffers(token, sku);
  }

  async getUserInventoryLocationKey(): Promise<string> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/location`, {
      method: 'GET',
      headers: this.ebayHeaders(token)
    });

    if (!response.ok) {
      throw new Error(`Failed to get inventory locations: ${response.statusText}`);
    }

    const data = await response.json();
    const locations = data.locations || [];
    
    if (locations.length === 0) {
      throw new Error('No inventory locations found. Please set up an inventory location in eBay.');
    }

    const defaultLocation = locations.find((loc: any) => loc.locationTypes?.includes('WAREHOUSE')) || locations[0];
    logStep('Using inventory location', { key: defaultLocation.merchantLocationKey, name: defaultLocation.name });
    
    return defaultLocation.merchantLocationKey;
  }
}

// Validation and utility functions
async function validateListingData(listing: any, userProfile: any): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  if (!listing.title || listing.title.length < 10) {
    errors.push('Title must be at least 10 characters');
  }
  if (!listing.price || listing.price <= 0) {
    errors.push('Price must be greater than $0');
  }
  if (!listing.condition) {
    errors.push('Condition is required');
  }
  
  const hasNewPhotos = listing.listing_photos && listing.listing_photos.length > 0;
  const hasLegacyPhotos = listing.photos && listing.photos.length > 0;
  
  if (!hasNewPhotos && !hasLegacyPhotos) {
    errors.push('At least one photo is required to sync this listing to eBay');
  }
  
  // Only validate policies for business accounts - individual accounts use inline fulfillment
  const isIndividualAccount = EbayOfferManager.isIndividualAccount(userProfile);
  if (!isIndividualAccount) {
    if (!userProfile.ebay_payment_policy_id || 
        !userProfile.ebay_return_policy_id || 
        !userProfile.ebay_fulfillment_policy_id) {
      errors.push('eBay policies not configured. Please refresh your eBay policies.');
    }
  } else {
    // For individual accounts, validate fulfillment data instead
    if (!userProfile.shipping_cost_domestic) {
      errors.push('Shipping cost is required for individual accounts');
    }
    if (!userProfile.handling_time_days) {
      errors.push('Handling time is required for individual accounts');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Main sync function
async function syncListingToEbay(supabaseClient: any, userId: string, listingId: string, dryRun: boolean = false) {
  // 🔍 CRITICAL DEBUG - Function entry point
  console.log('🔍 CRITICAL DEBUG - syncListingToEbay called:', { 
    listingId, 
    userId, 
    dryRun,
    timestamp: new Date().toISOString()
  });

  logStep('🚀 Starting eBay listing sync', { listingId, userId, dryRun });
  
  try {
    // 1. Fetch listing with photos
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', listingId)
      .eq('user_id', userId)
      .single();

    if (listingError || !listing) {
      throw new Error(`Listing not found: ${listingError?.message}`);
    }

    logStep('✅ Listing fetched', { 
      title: listing.title, 
      photos: listing.listing_photos?.length || 0,
      legacyPhotos: listing.photos?.length || 0
    });

    // 2. Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    logStep('✅ User profile fetched', { 
      hasEbayPolicies: !!(userProfile.ebay_payment_policy_id && userProfile.ebay_return_policy_id && userProfile.ebay_fulfillment_policy_id)
    });

    // 3. Validate listing
    const validation = await validateListingData(listing, userProfile);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    logStep('✅ Listing validation passed');

    // 4. Check existing sync
    const { data: existingSync } = await supabaseClient
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('platform', 'ebay')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSync?.status === 'active') {
      logStep('✅ Listing already synced', { 
        platformListingId: existingSync.platform_listing_id,
        platformUrl: existingSync.platform_url 
      });
      return {
        status: 'already_synced',
        platform_listing_id: existingSync.platform_listing_id,
        platform_url: existingSync.platform_url
      };
    }

    if (dryRun) {
      logStep('✅ Dry run successful - listing ready for sync');
      return {
        status: 'dry_run_success',
        validation,
        simulatedData: {
          sku: listingId,
          title: listing.title,
          price: listing.price
        }
      };
    }

    // 🔍 CRITICAL DEBUG - Early execution checkpoint
    console.log('🔍 CRITICAL DEBUG - About to create offer data:', {
      listingId,
      userProfile: {
        ebay_payment_policy_id: userProfile.ebay_payment_policy_id,
        ebay_fulfillment_policy_id: userProfile.ebay_fulfillment_policy_id,
        ebay_return_policy_id: userProfile.ebay_return_policy_id,
        preferred_shipping_service: userProfile.preferred_shipping_service
      }
    });

    // 5. Initialize eBay shipping services with real data
    logStep('🚀 Initializing eBay shipping services');
    await EbayShippingServices.initialize(userId);
    logStep('✅ eBay shipping services initialized');

    // 6. Initialize eBay API
    const ebayApi = new EbayInventoryAPI(false, supabaseClient, userId);
    const ebayLocationKey = await ebayApi.getUserInventoryLocationKey();

    // 7. Create inventory item
    const inventoryData = EbayInventoryItemManager.mapListingToEbayInventory(listing, listing.listing_photos);
    await ebayApi.createInventoryItem(listingId, inventoryData);

    logStep('✅ Inventory item created');

    // 8. Handle offers with automatic cleanup
    const offerResult = await ebayApi.handleExistingOffers(listingId);
    
    let offerId: string;
    let ebayListingId: string;

    if (offerResult.alreadyPublished) {
      logStep('✅ Using existing published offer', { 
        offerId: offerResult.alreadyPublished.offerId,
        listingId: offerResult.alreadyPublished.listingId 
      });
      offerId = offerResult.alreadyPublished.offerId;
      ebayListingId = offerResult.alreadyPublished.listingId;
    } else if (offerResult.shouldCreateNew) {
      // Create new offer with eBay API validated shipping services
      const offerData = await ebayApi.offerManager.createOfferData(listing, listingId, userProfile, ebayLocationKey);
      
      // Enhanced logging for troubleshooting
      const fulfillmentValidation = EbayShippingServices.validateFulfillmentDetails(offerData.fulfillmentDetails || {});
      logStep('🔍 Pre-creation validation', {
        isValid: fulfillmentValidation.isValid,
        errors: fulfillmentValidation.errors,
        serviceCode: offerData.fulfillmentDetails?.shippingOptions[0]?.shippingServices[0]?.serviceCode,
        accountType: EbayOfferManager.isIndividualAccount(userProfile) ? 'individual' : 'business'
      });
      
      if (!fulfillmentValidation.isValid) {
        throw new Error(`Invalid fulfillment data: ${fulfillmentValidation.errors.join(', ')}`);
      }
      
      offerId = await ebayApi.createOffer(offerData);
      logStep('✅ Offer created');

      // Publish offer with fallback retry logic
      try {
        ebayListingId = await ebayApi.publishOffer(offerId);
        logStep('✅ Offer published', { ebayListingId });
      } catch (publishError: any) {
        logStep('❌ Offer publish failed, attempting fallback', { error: publishError.message });
        
        // Check if it's a shipping service error (Error 25007)
        if (publishError.message.includes('25007') || publishError.message.includes('shipping service')) {
          logStep('🔄 Attempting with fallback shipping service');
          
          // Get fallback fulfillment details
          const fallbackFulfillmentDetails = await EbayShippingServices.createFulfillmentDetailsWithFallback(
            userProfile, 
            { 
              attemptedService: offerData.fulfillmentDetails?.shippingOptions[0]?.shippingServices[0]?.serviceCode,
              userId: userId
            }
          );
          
          // Update offer with fallback shipping
          const fallbackOfferData = {
            ...offerData,
            fulfillmentDetails: fallbackFulfillmentDetails
          };
          
          // Delete failed offer and create new one
          await ebayApi.deleteOffer(offerId);
          const fallbackOfferId = await ebayApi.createOffer(fallbackOfferData);
          ebayListingId = await ebayApi.publishOffer(fallbackOfferId);
          offerId = fallbackOfferId;
          
          logStep('✅ Fallback offer published successfully', { 
            ebayListingId, 
            fallbackService: fallbackFulfillmentDetails.shippingOptions[0]?.shippingServices[0]?.serviceCode 
          });
        } else {
          throw publishError;
        }
      }
    } else {
      throw new Error('Unexpected offer handling result');
    }

    // 9. Update platform_listings table
    await supabaseClient.from('platform_listings').upsert({
      listing_id: listingId,
      user_id: userId,
      platform: 'ebay',
      platform_listing_id: ebayListingId,
      platform_url: `https://www.ebay.com/itm/${ebayListingId}`,
      status: 'active',
      last_synced_at: new Date().toISOString(),
      platform_data: {
        offer_id: offerId,
        sku: listingId
      }
    });

    logStep('✅ Platform listing record updated');

    return {
      status: 'success',
      platform_listing_id: ebayListingId,
      platform_url: `https://www.ebay.com/itm/${ebayListingId}`,
      offer_id: offerId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('❌ Sync failed', { error: errorMessage });
    throw error;
  }
}

// Serve function  
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestData: any = {};
  let userData: any = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userAuthData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    userData = userAuthData;
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    requestData = await req.json();
    const { listingId, action = 'sync_listing', dryRun = false } = requestData;
    
    // Test fetching valid shipping services if requested
    if (action === 'test_shipping_service_fetcher') {
      logStep('🧪 Testing eBay shipping service fetcher');
      
      try {
        const services = await EbayShippingServices.fetchValidServices(user.id, requestData.forceRefresh);
        
        return new Response(JSON.stringify({
          status: 'test_complete',
          services,
          serviceCount: services.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({
          status: 'test_error',
          error: errorMessage
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }
    
    if (!listingId) throw new Error('Listing ID required');

    const result = await syncListingToEbay(supabaseClient, user.id, listingId, dryRun);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Enhanced error logging for debugging
    logStep("❌ CRITICAL ERROR", { 
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      requestData: requestData ? { listingId: requestData.listingId, action: requestData.action } : null
    });
    
    // Log to Supabase for persistence (best effort)
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      await supabaseClient.from('posting_queue').insert({
        user_id: userData?.user?.id || 'unknown',
        listing_id: requestData?.listingId || 'unknown',
        platform: 'ebay',
        queue_status: 'error',
        error_message: errorMessage,
        result_data: { 
          error: errorMessage, 
          stack: errorStack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      // Don't fail the response if logging fails
      console.error('Failed to log error to database:', logError);
    }
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});