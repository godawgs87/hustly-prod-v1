import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-SHIPPING-SERVICES] ${step}${detailsStr}`);
};

// Hardcoded shipping services for individual accounts using VALID eBay service codes
const INDIVIDUAL_SHIPPING_SERVICES = {
  'usps_priority': {
    serviceCode: 'USPSPriority',
    serviceName: 'USPS Priority Mail',
    isDomestic: true,
    isInternational: false
  },
  'usps_ground': {
    serviceCode: 'USPSGround', 
    serviceName: 'USPS Ground',
    isDomestic: true,
    isInternational: false
  },
  'usps_media': {
    serviceCode: 'USPSMedia',
    serviceName: 'USPS Media Mail',
    isDomestic: true,
    isInternational: false
  },
  'usps_first_class': {
    serviceCode: 'USPSFirstClass',
    serviceName: 'USPS First Class',
    isDomestic: true,
    isInternational: false
  },
  'other': {
    serviceCode: 'USPSPriority',
    serviceName: 'USPS Priority Mail',
    isDomestic: true,
    isInternational: false
  }
};

// Create fulfillment details for individual accounts
function createIndividualFulfillmentDetails(
  userProfile: any,
  shippingService: string = 'usps_priority'
): any {
  const serviceMapping = INDIVIDUAL_SHIPPING_SERVICES[shippingService as keyof typeof INDIVIDUAL_SHIPPING_SERVICES] || 
                        INDIVIDUAL_SHIPPING_SERVICES.usps_priority;

  const domesticCost = userProfile.shipping_cost_domestic || 9.95;
  const additionalCost = userProfile.shipping_cost_additional || 2.00;
  const handlingTime = userProfile.handling_time_days || 1;

  return {
    handlingTime: {
      value: handlingTime,
      unit: 'DAY'
    },
    shippingOptions: [
      {
        optionType: 'DOMESTIC',
        costType: 'FLAT_RATE',
        shippingServices: [
          {
            serviceCode: serviceMapping.serviceCode,
            shippingCost: {
              value: domesticCost.toFixed(2),
              currency: 'USD'
            },
            additionalShippingCost: {
              value: additionalCost.toFixed(2),
              currency: 'USD'
            }
          }
        ]
      }
    ],
    shipToLocations: {
      regionIncluded: [
        {
          regionName: 'United States',
          regionType: 'COUNTRY'
        }
      ]
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay shipping services handler started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !data.user?.id) {
      throw new Error("User not authenticated");
    }

    const userId = data.user.id;
    logStep("User authenticated", { userId });

    // Get request body
    const { preferredService, forceRefresh } = await req.json();
    logStep("Request parameters", { preferredService, forceRefresh });

    // Fetch user profile and account type
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error("User profile not found");
    }

    // Check eBay account type
    let ebayAccountType = userProfile.ebay_account_type || 'individual';
    
    const { data: marketplaceAccount } = await supabaseClient
      .from('marketplace_accounts')
      .select('ebay_account_type')
      .eq('user_id', userId)
      .eq('platform', 'ebay')
      .single();

    if (marketplaceAccount?.ebay_account_type) {
      ebayAccountType = marketplaceAccount.ebay_account_type;
    }

    logStep("Account type determined", { accountType: ebayAccountType });

    if (ebayAccountType === 'individual') {
      // For individual accounts, use hardcoded shipping services
      logStep("Processing individual account - using hardcoded services");
      
      const fulfillmentDetails = createIndividualFulfillmentDetails(
        userProfile,
        preferredService || userProfile.preferred_shipping_service || 'usps_priority'
      );

      logStep("Individual fulfillment details created", {
        serviceCode: fulfillmentDetails.shippingOptions[0].shippingServices[0].serviceCode,
        cost: fulfillmentDetails.shippingOptions[0].shippingServices[0].shippingCost.value
      });

      return new Response(
        JSON.stringify({
          success: true,
          accountType: 'individual',
          fulfillmentDetails,
          serviceMapping: INDIVIDUAL_SHIPPING_SERVICES
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // For business accounts, fetch from eBay API (existing logic)
      logStep("Processing business account - fetching from eBay API");
      
      // This would contain the existing business account logic
      // For now, return a basic response
      return new Response(
        JSON.stringify({
          success: true,
          accountType: 'business',
          message: 'Business account shipping services - API integration needed'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    logStep("CRITICAL ERROR", { error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});