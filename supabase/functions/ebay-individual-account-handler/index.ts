import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INDIVIDUAL-HANDLER] ${step}${detailsStr}`);
};

// Enhanced shipping service mapping for individual accounts
const INDIVIDUAL_SHIPPING_SERVICES = {
  'usps_priority': 'ShippingMethodStandard',
  'usps_ground': 'ShippingMethodStandard', 
  'usps_media': 'ShippingMethodStandard',
  'ups_ground': 'ShippingMethodStandard',
  'fedex_ground': 'ShippingMethodStandard',
  'other': 'ShippingMethodStandard'
};

function createIndividualOffer(listing: any, userProfile: any): any {
  const serviceCode = INDIVIDUAL_SHIPPING_SERVICES[userProfile.preferred_shipping_service as keyof typeof INDIVIDUAL_SHIPPING_SERVICES] || 
                     INDIVIDUAL_SHIPPING_SERVICES.usps_priority;

  const domesticCost = userProfile.shipping_cost_domestic || 9.95;
  const additionalCost = userProfile.shipping_cost_additional || 2.00;
  const handlingTime = userProfile.handling_time_days || 1;

  return {
    sku: listing.id,
    marketplaceId: 'EBAY_US',
    format: 'FIXED_PRICE',
    availableQuantity: 1,
    categoryId: listing.ebay_category_id || '20614', // Default to generic category
    merchantLocationKey: 'main_warehouse',
    pricingSummary: {
      price: {
        value: listing.price.toFixed(2),
        currency: 'USD'
      }
    },
    listingDescription: listing.description || listing.title,
    fulfillmentDetails: {
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
              serviceCode: serviceCode,
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
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Individual account handler started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
    const { action, listingId } = await req.json();

    logStep("Processing request", { action, listingId, userId });

    if (action === 'create_offer') {
      // Fetch listing and user profile
      const { data: listing, error: listingError } = await supabaseClient
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('user_id', userId)
        .single();

      if (listingError || !listing) {
        throw new Error("Listing not found");
      }

      const { data: userProfile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        throw new Error("User profile not found");
      }

      // Ensure this is an individual account
      if (userProfile.ebay_account_type !== 'individual') {
        throw new Error("This handler is only for individual accounts");
      }

      // Create optimized offer for individual account
      const offer = createIndividualOffer(listing, userProfile);

      logStep("Individual offer created", {
        sku: offer.sku,
        serviceCode: offer.fulfillmentDetails.shippingOptions[0].shippingServices[0].serviceCode,
        price: offer.pricingSummary.price.value
      });

      return new Response(
        JSON.stringify({
          success: true,
          offer,
          accountType: 'individual',
          optimizedForIndividual: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'validate_account') {
      // Validate that user has individual account setup
      const { data: userProfile } = await supabaseClient
        .from('user_profiles')
        .select('ebay_account_type, preferred_shipping_service, ebay_payment_policy_id')
        .eq('id', userId)
        .single();

      const isProperlyConfigured = 
        userProfile?.ebay_account_type === 'individual' &&
        userProfile?.preferred_shipping_service !== 'other' &&
        userProfile?.ebay_payment_policy_id === 'INDIVIDUAL_DEFAULT_PAYMENT';

      return new Response(
        JSON.stringify({
          success: true,
          isProperlyConfigured,
          accountType: userProfile?.ebay_account_type || 'unknown',
          recommendations: isProperlyConfigured ? [] : [
            'Set account type to individual',
            'Change preferred shipping service from "other" to "usps_priority"',
            'Ensure eBay policy IDs are set to INDIVIDUAL_DEFAULT_*'
          ]
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    throw new Error("Invalid action");

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