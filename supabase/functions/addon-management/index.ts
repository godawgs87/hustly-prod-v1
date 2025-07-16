import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADDON-MANAGEMENT] ${step}${detailsStr}`);
};

const ADDON_PRICING = {
  extra_listings: {
    name: "Extra Listings",
    description: "Add 25 additional listings to your current cycle",
    value: 25,
    price: 500, // $5.00 in cents
  },
  extra_marketplace: {
    name: "Extra Marketplace",
    description: "Connect to an additional marketplace",
    value: 1,
    price: 1000, // $10.00 in cents
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Add-on management function started");

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Get user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const body = await req.json();
    const { action, ...params } = body;

    logStep(`Processing action: ${action}`, params);

    // Route to appropriate handler
    if (action === 'create_checkout') {
      return await createAddonCheckout(user, params, stripeKey, supabaseClient, req);
    } else if (action === 'purchase_direct') {
      return await purchaseAddonDirect(user, params, supabaseClient);
    } else if (action === 'list_addons') {
      return await listUserAddons(user.id, supabaseClient);
    } else if (action === 'deactivate_addon') {
      return await deactivateAddon(user.id, params.addon_id, supabaseClient);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createAddonCheckout(user: any, params: any, stripeKey: string, supabaseClient: any, req: Request) {
  logStep("Creating add-on checkout", { userId: user.id, addonType: params.addon_type });

  const addon = ADDON_PRICING[params.addon_type as keyof typeof ADDON_PRICING];
  if (!addon) {
    throw new Error('Invalid add-on type');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  // Check if customer exists
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    logStep("Found existing Stripe customer", { customerId });
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
    });
    customerId = customer.id;
    logStep("Created new Stripe customer", { customerId });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: addon.name,
            description: addon.description,
          },
          unit_amount: addon.price,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/settings?tab=billing&addon_success=${params.addon_type}`,
    cancel_url: `${origin}/settings?tab=billing&addon_cancel=true`,
    metadata: {
      user_id: user.id,
      addon_type: params.addon_type,
      addon_value: params.addon_value.toString(),
    },
  });

  logStep("Checkout session created", { sessionId: session.id, url: session.url });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function purchaseAddonDirect(user: any, params: any, supabaseClient: any) {
  logStep("Direct add-on purchase", { userId: user.id, addonType: params.addon_type });

  const addon = ADDON_PRICING[params.addon_type as keyof typeof ADDON_PRICING];
  if (!addon) {
    throw new Error('Invalid add-on type');
  }

  // Get user's billing cycle info
  const { data: profile, error: profileError } = await supabaseClient
    .from('user_profiles')
    .select('billing_cycle_start, billing_cycle_end')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  // Create add-on record
  const { error: insertError } = await supabaseClient
    .from('user_addons')
    .insert({
      user_id: user.id,
      addon_type: params.addon_type,
      addon_value: addon.value,
      price_paid: addon.price / 100,
      billing_cycle_start: profile.billing_cycle_start,
      billing_cycle_end: profile.billing_cycle_end
    });

  if (insertError) {
    throw new Error(`Failed to create add-on: ${insertError.message}`);
  }

  logStep("Add-on purchased successfully");

  return new Response(JSON.stringify({
    success: true,
    addon: {
      type: params.addon_type,
      name: addon.name,
      value: addon.value,
      price: addon.price / 100
    }
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function listUserAddons(userId: string, supabaseClient: any) {
  logStep("Listing user add-ons", { userId });

  const { data: addons, error } = await supabaseClient
    .from('user_addons')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('billing_cycle_end', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch add-ons: ${error.message}`);
  }

  return new Response(JSON.stringify({ addons: addons || [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function deactivateAddon(userId: string, addonId: string, supabaseClient: any) {
  logStep("Deactivating add-on", { userId, addonId });

  const { error } = await supabaseClient
    .from('user_addons')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', addonId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to deactivate add-on: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}