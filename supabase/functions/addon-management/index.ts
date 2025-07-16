import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADDON-MANAGEMENT] ${step}${detailsStr}`);
};

const ADDON_PRICING = {
  extra_listings: {
    name: 'Extra Listings Pack',
    description: '25 additional listings for this billing cycle',
    price: 500, // $5.00 in cents
    value: 25
  },
  extra_marketplace: {
    name: 'Extra Marketplace Access',
    description: 'Add one additional marketplace for this billing cycle',
    price: 1000, // $10.00 in cents
    value: 1
  },
  bulk_upload_boost: {
    name: 'Bulk Upload Booster',
    description: 'Enable bulk upload for Side Hustler plan',
    price: 1500, // $15.00 in cents
    value: 1
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Add-on management function started");

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
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
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json();
    const { action, ...params } = requestBody;

    switch (action) {
      case 'create_checkout':
        return await createAddonCheckout(user, params, stripeKey, supabaseClient);
      
      case 'purchase_direct':
        return await purchaseAddonDirect(user, params, supabaseClient);
      
      case 'list_addons':
        return await listUserAddons(user.id, supabaseClient);
      
      case 'deactivate_addon':
        return await deactivateAddon(user.id, params.addon_id, supabaseClient);
      
      default:
        throw new Error('Invalid action specified');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createAddonCheckout(user: any, params: any, stripeKey: string, supabaseClient: any) {
  logStep("Creating add-on checkout", { userId: user.id, addonType: params.addon_type });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  const addon = ADDON_PRICING[params.addon_type as keyof typeof ADDON_PRICING];
  if (!addon) {
    throw new Error('Invalid add-on type');
  }

  // Get or create Stripe customer
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  let customerId;
  
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id }
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: addon.name,
            description: addon.description
          },
          unit_amount: addon.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${req.headers.get("origin")}/dashboard?addon_success=true`,
    cancel_url: `${req.headers.get("origin")}/dashboard`,
    metadata: {
      user_id: user.id,
      addon_type: params.addon_type,
      addon_value: addon.value.toString(),
      price_paid: (addon.price / 100).toString()
    }
  });

  logStep("Add-on checkout session created", { sessionId: session.id });

  return new Response(JSON.stringify({ 
    url: session.url,
    session_id: session.id 
  }), {
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

  return new Response(JSON.stringify({
    addons: addons || []
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function deactivateAddon(userId: string, addonId: string, supabaseClient: any) {
  logStep("Deactivating add-on", { userId, addonId });

  const { error } = await supabaseClient
    .from('user_addons')
    .update({ is_active: false })
    .eq('id', addonId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to deactivate add-on: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Add-on deactivated successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}