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

// Health check endpoint
const handleHealthCheck = () => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasStripeKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
    }
  }
  
  logStep('Health check', health)
  
  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

// Create user profile if it doesn't exist
const ensureUserProfile = async (supabaseClient: any, userId: string, email: string) => {
  try {
    logStep('Checking/creating user profile for:', userId)
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logStep('Error checking profile:', checkError)
      throw checkError
    }

    if (!existingProfile) {
      logStep('Creating new user profile')
      
      // Reset photo count if new month
      const now = new Date()
      const currentDate = now.toISOString().split('T')[0]
      
      const { error: createError } = await supabaseClient
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          full_name: 'User',
          subscription_tier: 'trial',
          subscription_status: 'active',
          monthly_photo_limit: 50,
          photos_used_this_month: 0,
          last_photo_reset_date: currentDate,
          billing_cycle_start: currentDate,
          billing_cycle_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          listings_used_this_cycle: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })

      if (createError) {
        logStep('Error creating profile:', createError)
        throw createError
      }

      logStep('User profile created successfully')
    } else {
      logStep('User profile already exists')
      
      // Check if we need to reset monthly photo count
      const { data: profile, error: getError } = await supabaseClient
        .from('user_profiles')
        .select('last_photo_reset_date, photos_used_this_month')
        .eq('id', userId)
        .single()

      if (!getError && profile) {
        const now = new Date()
        const currentDate = now.toISOString().split('T')[0]
        const lastResetDate = profile.last_photo_reset_date

        // Reset if it's a new month
        if (!lastResetDate || lastResetDate < currentDate.substring(0, 7) + '-01') {
          logStep('Resetting monthly photo count')
          
          await supabaseClient
            .from('user_profiles')
            .update({
              photos_used_this_month: 0,
              last_photo_reset_date: currentDate,
              updated_at: now.toISOString()
            })
            .eq('id', userId)
        }
      }
    }
  } catch (error) {
    logStep('Error in ensureUserProfile:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.url.includes('/health')) {
    return handleHealthCheck()
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

    // Ensure user profile exists
    await ensureUserProfile(supabaseClient, user.id, user.email)

    // Enhanced request parsing with detailed logging
    let requestBody: any = {};
    let requestText = '';
    
    try {
      // Log request details for debugging
      const contentType = req.headers.get('content-type') || 'none';
      const contentLength = req.headers.get('content-length') || '0';
      
      logStep("Request details", { 
        method: req.method,
        contentType,
        contentLength,
        hasBody: contentLength !== '0'
      });
      
      // Get raw request text
      requestText = await req.text();
      logStep("Raw request body", { 
        body: requestText.substring(0, 200),
        bodyLength: requestText.length 
      });
      
      // Parse request body with multiple fallback methods
      if (requestText.trim()) {
        try {
          requestBody = JSON.parse(requestText);
          logStep("Successfully parsed JSON", { keys: Object.keys(requestBody) });
        } catch (jsonError) {
          logStep("JSON parse failed, trying URL-encoded", { error: jsonError });
          
          // Try as URL-encoded form data
          const urlParams = new URLSearchParams(requestText);
          requestBody = Object.fromEntries(urlParams.entries());
          
          if (Object.keys(requestBody).length === 0) {
            logStep("All parsing methods failed", { rawBody: requestText.substring(0, 100) });
            // For subscription management, empty body defaults to check_subscription
            requestBody = { action: 'check_subscription' };
          } else {
            logStep("Parsed as URL-encoded", { keys: Object.keys(requestBody) });
          }
        }
      } else {
        logStep("Empty request body - defaulting to subscription check");
        requestBody = { action: 'check_subscription' };
      }
      
    } catch (parseError) {
      const errorMsg = `Request parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      logStep("ERROR: Request parse failed", { 
        error: parseError,
        rawBody: requestText.substring(0, 100)
      });
      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: { rawBody: requestText.substring(0, 100) }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { action, ...params } = requestBody as { action?: string, [key: string]: any }

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
        // Default to subscription check if no action specified
        return await checkSubscriptionStatus(supabaseClient, user, stripeKey);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Determine appropriate error status
    let statusCode = 500;
    if (errorMessage.includes('Authentication') || errorMessage.includes('Auth session missing')) {
      statusCode = 401;
    } else if (errorMessage.includes('not configured') || errorMessage.includes('Missing')) {
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Invalid')) {
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      function: 'subscription-management',
      details: 'Check edge function logs for more information'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
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

  // First, check existing database subscription data
  const { data: existingProfile, error: profileError } = await supabaseClient
    .from('user_profiles')
    .select('subscription_tier, subscription_status, subscription_ends_at, user_role')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    logStep("Error fetching profile", { error: profileError });
  }

  logStep("Existing profile data", { 
    tier: existingProfile?.subscription_tier, 
    status: existingProfile?.subscription_status,
    role: existingProfile?.user_role 
  });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  // Find Stripe customer
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  
  if (customers.data.length === 0) {
    logStep("No Stripe customer found - using database subscription data");
    
    // If we have existing subscription data in database, preserve it
    if (existingProfile?.subscription_tier && existingProfile.subscription_tier !== 'trial') {
      logStep("Using existing database subscription", { 
        tier: existingProfile.subscription_tier,
        status: existingProfile.subscription_status 
      });
      
      return new Response(JSON.stringify({ 
        subscribed: existingProfile.subscription_status === 'active',
        subscription_tier: existingProfile.subscription_tier,
        subscription_status: existingProfile.subscription_status || 'active',
        subscription_end: existingProfile.subscription_ends_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // No existing subscription - set to trial
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
    
    // Determine tier from price - map to actual frontend tier names
    const priceId = subscription.items.data[0].price.id;
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount || 0;
    
    if (amount >= 8900) {
      subscriptionTier = 'full_time_flipper';
    } else if (amount >= 4900) {
      subscriptionTier = 'serious_seller';
    } else if (amount >= 1900) {
      subscriptionTier = 'side_hustler';
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

  // Update user profile - preserve existing database tier for admin/tester users
  let finalTier = subscriptionTier;
  
  // Check if user has admin/tester role and existing database tier
  if (existingProfile?.user_role === 'admin' || existingProfile?.user_role === 'tester') {
    if (existingProfile?.subscription_tier && existingProfile.subscription_tier !== 'trial') {
      logStep("Preserving existing admin/tester tier", { 
        role: existingProfile.user_role,
        existingTier: existingProfile.subscription_tier,
        stripeTier: subscriptionTier
      });
      finalTier = existingProfile.subscription_tier;
    }
  }

  await supabaseClient.from("user_profiles").upsert({
    id: user.id,
    email: user.email,
    subscription_tier: finalTier,
    subscription_status: hasActiveSub ? 'active' : 'inactive',
    subscription_ends_at: subscriptionEnd
  }, { onConflict: 'id' });

  return new Response(JSON.stringify({
    subscribed: hasActiveSub,
    subscription_tier: finalTier,
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
    enterprise: { photos_per_month: -1 }, // Unlimited
    'full-time-flipper': { photos_per_month: -1 }, // Unlimited (legacy tier)
    founders: { photos_per_month: -1 } // Unlimited
  };
  
  return limits[tier as keyof typeof limits] || limits.trial;
}

function checkUsageLimits(profile: any, updateData: any, limits: any) {
  const photosUsed = updateData.photos_used_this_month || profile.photos_used_this_month || 0;
  
  if (limits.photos_per_month === -1) return false; // Unlimited
  
  return photosUsed > limits.photos_per_month;
}