import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EbayOfferManager } from './ebay-offer-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY-SYNC] ${step}${detailsStr}`);
};

// ========== EBAY INVENTORY API CLASS ==========
class EbayInventoryAPI {
  baseUrl: string;
  supabaseClient: any;
  userId: string;

  constructor(isSandbox = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  ebayHeaders(token: string) {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
    return headers;
  }

  async getAccessToken() {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('oauth_token')
      .eq('user_id', this.userId)
      .eq('platform', 'ebay')
      .single();

    if (error || !account) {
      throw new Error('No eBay account found');
    }

    return account.oauth_token;
  }

  async getUserBusinessPolicies(userProfile: any) {
    const token = await this.getAccessToken();
    
    logStep('📋 Missing business policies - checking if account is opted in', {
      hasPayment: false,
      hasFulfillment: false, 
      hasReturn: false
    });

    // Fetch policies from eBay
    const [fulfillmentResponse, paymentResponse, returnResponse] = await Promise.all([
      fetch(`${this.baseUrl}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
        headers: this.ebayHeaders(token)
      }),
      fetch(`${this.baseUrl}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`, {
        headers: this.ebayHeaders(token)
      }),
      fetch(`${this.baseUrl}/sell/account/v1/return_policy?marketplace_id=EBAY_US`, {
        headers: this.ebayHeaders(token)
      })
    ]);

    let fulfillmentData: any = null;
    let fulfillmentError: string | null = null;
    if (fulfillmentResponse.ok) {
      fulfillmentData = await fulfillmentResponse.json();
    } else {
      fulfillmentError = await fulfillmentResponse.text();
    }

    let paymentData: any = null;
    let paymentError: string | null = null;
    if (paymentResponse.ok) {
      paymentData = await paymentResponse.json();
    } else {
      paymentError = await paymentResponse.text();
    }

    let returnData: any = null;
    let returnError: string | null = null;
    if (returnResponse.ok) {
      returnData = await returnResponse.json();
    } else {
      returnError = await returnResponse.text();
    }

    logStep('Policy fetch responses', {
      fulfillment: {
        status: fulfillmentResponse.status,
        ok: fulfillmentResponse.ok,
        hasData: !!fulfillmentData,
        policyCount: fulfillmentData?.fulfillmentPolicies?.length || 0,
        error: fulfillmentError
      },
      payment: {
        status: paymentResponse.status,
        ok: paymentResponse.ok,
        hasData: !!paymentData,
        policyCount: paymentData?.paymentPolicies?.length || 0,
        error: paymentError
      },
      return: {
        status: returnResponse.status,
        ok: returnResponse.ok,
        hasData: !!returnData,
        policyCount: returnData?.returnPolicies?.length || 0,
        error: returnError
      }
    });

    let fulfillmentPolicyId = null;
    let paymentPolicyId = null;
    let returnPolicyId = null;

    // Extract policy IDs
    if (fulfillmentData?.fulfillmentPolicies?.length > 0) {
      fulfillmentPolicyId = fulfillmentData.fulfillmentPolicies[0].fulfillmentPolicyId;
    }

    if (paymentData?.paymentPolicies?.length > 0) {
      paymentPolicyId = paymentData.paymentPolicies[0].paymentPolicyId;
    }

    if (returnData?.returnPolicies?.length > 0) {
      returnPolicyId = returnData.returnPolicies[0].returnPolicyId;
      logStep('Found return policies', {
        count: returnData.returnPolicies.length,
        selected: returnPolicyId,
        available: returnData.returnPolicies.map((p: any) => ({
          id: p.returnPolicyId,
          name: p.name
        }))
      });
    }

    // If we're missing policies, try to create them
    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
      logStep('📝 Missing some business policies - attempting to create defaults', {
        hasFulfillment: !!fulfillmentPolicyId,
        hasPayment: !!paymentPolicyId,
        hasReturn: !!returnPolicyId,
        note: 'Creating default policies from Hustly settings'
      });
      
      // Create missing policies
      if (!paymentPolicyId) {
        logStep('Creating default payment policy...');
        paymentPolicyId = await this.createDefaultPolicy('payment', token, userProfile);
      }
      
      if (!fulfillmentPolicyId) {
        logStep('Creating default fulfillment policy...');
        fulfillmentPolicyId = await this.createDefaultPolicy('fulfillment', token, userProfile);
      }
      
      if (!returnPolicyId) {
        logStep('Creating default return policy...');
        returnPolicyId = await this.createDefaultPolicy('return', token, userProfile);
      }
    }

    return {
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
      accountType: userProfile.ebay_account_type || 'individual'
    };
  }

  async createDefaultPolicy(policyType: string, token: string, userProfile: any) {
    let policyData: any;
    
    if (policyType === 'payment') {
      policyData = {
        name: "Hustly Default Payment",
        description: "Payment policy from Hustly settings",
        marketplaceId: "EBAY_US",
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }],
        paymentMethods: [
          { 
            paymentMethodType: "EBAY",
            brands: ["VISA", "MASTERCARD", "DISCOVER", "AMERICAN_EXPRESS"]
          }
        ],
        immediatePay: false
      };
    } else if (policyType === 'fulfillment') {
      // Use Hustly business settings if available
      const handlingDays = userProfile?.handling_time_days || 1;
      const shippingCost = userProfile?.shipping_cost_domestic || 10.00;
      const additionalCost = userProfile?.shipping_cost_additional || 0.00;
      const freeShipping = userProfile?.offers_free_shipping || false;
      
      // Build the shipping service object
      const shippingService: any = {
        sortOrder: 1,
        shippingCarrierCode: "USPS",
        shippingServiceCode: "USPSPriority"
      };
      
      if (freeShipping) {
        shippingService.freeShipping = true;
      } else {
        shippingService.shippingCost = {
          value: String(shippingCost.toFixed(2)),
          currency: "USD"
        };
        shippingService.additionalShippingCost = {
          value: String(additionalCost.toFixed(2)),
          currency: "USD"
        };
      }
      
      policyData = {
        name: "Hustly Default Shipping",
        description: "Shipping policy from Hustly settings",
        marketplaceId: "EBAY_US",
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }],
        handlingTime: {
          value: handlingDays,
          unit: "DAY"
        },
        shippingOptions: [{
          optionType: "DOMESTIC",
          costType: freeShipping ? "FREE" : "FLAT_RATE",
          shippingServices: [shippingService]
        }]
      };
    } else if (policyType === 'return') {
      // Use Hustly business settings if available
      const acceptsReturns = userProfile?.accepts_returns ?? true;
      const returnDays = userProfile?.return_period_days || 30;
      
      policyData = {
        name: "Hustly Default Returns",
        description: "Return policy from Hustly settings",
        marketplaceId: "EBAY_US",
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }],
        returnsAccepted: acceptsReturns
      };
      
      // Only add optional fields if returns are accepted
      if (acceptsReturns) {
        policyData.returnPeriod = {
          value: returnDays,
          unit: "DAY"
        };
        policyData.returnShippingCostPayer = "BUYER";
        policyData.refundMethod = "MONEY_BACK";
      }
    }
    
    const headers = this.ebayHeaders(token);
    headers.set('Content-Type', 'application/json');
    
    // Log the policy data being sent for debugging
    logStep(`📝 Creating ${policyType} policy with data:`, policyData);
    
    const response = await fetch(`${this.baseUrl}/sell/account/v1/${policyType}_policy`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(policyData)
    });
    
    if (response.ok) {
      const result = await response.json();
      const policyId = result[`${policyType}PolicyId`];
      logStep(`✅ Created default ${policyType} policy`, { policyId });
      return policyId;
    } else {
      const errorText = await response.text();
      logStep(`❌ Failed to create ${policyType} policy`, { 
        error: errorText,
        policyData: policyData 
      });
      
      // Log the specific error for debugging
      if (policyType === 'payment') {
        logStep('⚠️ Cannot create business policies', {
          note: 'Seller may not be opted into business policies',
          suggestion: 'User needs to enable business policies in eBay account settings'
        });
      }
      
      return null;
    }
  }
}

// Main sync function
async function syncListingToEbay(supabaseClient: any, userId: string, listingId: string, dryRun = false) {
  console.log('🔍 CRITICAL DEBUG - syncListingToEbay called:', {
    listingId,
    userId,
    dryRun,
    timestamp: new Date().toISOString()
  });

  logStep('🚀 Starting eBay listing sync', { listingId, userId, dryRun });

  try {
    // 1. Fetch user profile first
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    logStep('✅ User profile fetched', { hasEbayPolicies: false });

    // 2. Initialize eBay API and get business policies
    const ebayApi = new EbayInventoryAPI(false, supabaseClient, userId);
    const businessPolicies = await ebayApi.getUserBusinessPolicies(userProfile);

    logStep('Business policies status', businessPolicies);

    // Check if we have all required policies
    if (!businessPolicies.fulfillmentPolicyId || !businessPolicies.paymentPolicyId) {
      logStep('⚠️ Could not obtain all required policies', {
        hasFulfillment: !!businessPolicies.fulfillmentPolicyId,
        hasPayment: !!businessPolicies.paymentPolicyId,
        hasReturn: !!businessPolicies.returnPolicyId
      });

      throw new Error('Your eBay account is not configured for business policies. Please enable business policies in your eBay account settings at: https://www.ebay.com/sh/buspolicy Then sync your policies to Hustly before creating listings.');
    }

    logStep('✅ All business policies obtained successfully');

    return {
      status: 'success',
      message: 'Business policies configured successfully'
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
  let user: any = null;

  try {
    logStep('📥 Raw request data received', await req.clone().json());

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    requestData = await req.json();
    const { listingId, dryRun = false } = requestData;

    // Get userId from listing if not provided in request
    if (!requestData.userId) {
      logStep('🔍 Fetching userId from listing record');
      const { data: listing, error: listingError } = await supabaseClient
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        throw new Error(`Listing not found: ${listingError?.message}`);
      }

      requestData.userId = listing.user_id;
      logStep('✅ Retrieved userId from listing', { userId: listing.user_id });
    }

    user = { id: requestData.userId };

    if (!listingId) throw new Error('Listing ID required');

    const result = await syncListingToEbay(supabaseClient, user.id, listingId, dryRun);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logStep("❌ CRITICAL ERROR", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      requestData
    });

    return new Response(JSON.stringify({
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});