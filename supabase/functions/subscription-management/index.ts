import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-MANAGEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_checkout':
        return await createCheckoutSession(user, params, stripeKey);
      
      case 'check_subscription':
        return await checkSubscriptionStatus(supabaseClient, user, stripeKey);
      
      case 'customer_portal':
        return await createCustomerPortalSession(user, stripeKey);
      
      case 'update_usage':
        return await updateUsageTracking(supabaseClient, user.id, params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createCheckoutSession(user: any, params: any, stripeKey: string) {
  logStep("Creating checkout session", { userId: user.id, plan: params.plan });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  // Get or create Stripe customer
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  let customerId;
  
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
    logStep("Found existing customer", { customerId });
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id }
    });
    customerId = customer.id;
    logStep("Created new customer", { customerId });
  }

  // Define plan pricing
  const plans = {
    starter: { price: 1900, name: 'Starter Plan' }, // $19/month
    professional: { price: 4900, name: 'Professional Plan' }, // $49/month
    enterprise: { price: 8900, name: 'Enterprise Plan' } // $89/month
  };

  const selectedPlan = plans[params.plan as keyof typeof plans];
  if (!selectedPlan) {
    throw new Error('Invalid plan selected');
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPlan.name,
            description: `Hustly ${selectedPlan.name} - AI-Powered Reselling Automation`
          },
          unit_amount: selectedPlan.price,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get("origin")}/pricing`,
    metadata: {
      user_id: user.id,
      plan: params.plan
    }
  });

  logStep("Checkout session created", { sessionId: session.id, url: session.url });

  return new Response(JSON.stringify({ 
    url: session.url,
    session_id: session.id 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function checkSubscriptionStatus(supabaseClient: any, user: any, stripeKey: string) {
  logStep("Checking subscription status", { userId: user.id, email: user.email });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  // Find Stripe customer
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  
  if (customers.data.length === 0) {
    logStep("No customer found, updating unsubscribed state");
    
    // Update user profile
    await supabaseClient.from("user_profiles").upsert({
      id: user.id,
      email: user.email,
      subscription_tier: 'trial',
      subscription_status: 'active'
    }, { onConflict: 'id' });

    return new Response(JSON.stringify({ 
      subscribed: false,
      subscription_tier: 'trial',
      subscription_status: 'active'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const customerId = customers.data[0].id;
  logStep("Found Stripe customer", { customerId });

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  const hasActiveSub = subscriptions.data.length > 0;
  let subscriptionTier = 'trial';
  let subscriptionEnd = null;
  let stripeSubscriptionId = null;

  if (hasActiveSub) {
    const subscription = subscriptions.data[0];
    stripeSubscriptionId = subscription.id;
    subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Determine tier from price
    const priceId = subscription.items.data[0].price.id;
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount || 0;
    
    if (amount >= 8900) {
      subscriptionTier = 'enterprise';
    } else if (amount >= 4900) {
      subscriptionTier = 'professional';
    } else if (amount >= 1900) {
      subscriptionTier = 'starter';
    }
    
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      tier: subscriptionTier,
      endDate: subscriptionEnd 
    });

    // Update/create subscription record
    await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: customerId,
      plan_name: subscriptionTier,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: subscriptionEnd,
      plan_price_monthly: amount
    }, { onConflict: 'user_id' });

  } else {
    logStep("No active subscription found");
  }

  // Update user profile
  await supabaseClient.from("user_profiles").upsert({
    id: user.id,
    email: user.email,
    subscription_tier: subscriptionTier,
    subscription_status: hasActiveSub ? 'active' : 'inactive',
    subscription_ends_at: subscriptionEnd
  }, { onConflict: 'id' });

  return new Response(JSON.stringify({
    subscribed: hasActiveSub,
    subscription_tier: subscriptionTier,
    subscription_status: hasActiveSub ? 'active' : 'inactive',
    subscription_end: subscriptionEnd
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function createCustomerPortalSession(user: any, stripeKey: string) {
  logStep("Creating customer portal session", { userId: user.id });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  if (customers.data.length === 0) {
    throw new Error("No Stripe customer found for this user");
  }
  
  const customerId = customers.data[0].id;
  
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${req.headers.get("origin")}/settings`,
  });

  logStep("Customer portal session created", { sessionId: portalSession.id });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function updateUsageTracking(supabaseClient: any, userId: string, params: any) {
  logStep("Updating usage tracking", { userId, type: params.type });

  const { type, count = 1 } = params;

  // Get current user profile
  const { data: profile, error } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  let updateData: any = {};

  switch (type) {
    case 'photo_analysis':
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const lastResetMonth = profile.last_photo_reset_date?.slice(0, 7);
      
      // Reset counter if new month
      if (currentMonth !== lastResetMonth) {
        updateData.photos_used_this_month = count;
        updateData.last_photo_reset_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.photos_used_this_month = (profile.photos_used_this_month || 0) + count;
      }
      break;
      
    default:
      throw new Error(`Unknown usage type: ${type}`);
  }

  const { error: updateError } = await supabaseClient
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update usage: ${updateError.message}`);
  }

  // Check usage limits
  const limits = getUsageLimits(profile.subscription_tier || 'trial');
  const isOverLimit = checkUsageLimits(profile, updateData, limits);

  return new Response(JSON.stringify({
    status: 'success',
    usage: {
      photos_used: updateData.photos_used_this_month || profile.photos_used_this_month || 0,
      photos_limit: limits.photos_per_month
    },
    over_limit: isOverLimit,
    message: 'Usage updated successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function getUsageLimits(tier: string) {
  const limits = {
    trial: { photos_per_month: 10 },
    starter: { photos_per_month: 50 },
    professional: { photos_per_month: 200 },
    enterprise: { photos_per_month: -1 } // Unlimited
  };
  
  return limits[tier as keyof typeof limits] || limits.trial;
}

function checkUsageLimits(profile: any, updateData: any, limits: any) {
  const photosUsed = updateData.photos_used_this_month || profile.photos_used_this_month || 0;
  
  if (limits.photos_per_month === -1) return false; // Unlimited
  
  return photosUsed > limits.photos_per_month;
}