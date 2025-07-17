
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  action: 'get_auth_url' | 'exchange_code';
  code?: string;
  state?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, code, state }: RequestBody = await req.json();
    console.log(`🚀 eBay OAuth Modern - Action: ${action}`);

    // Get eBay credentials
    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    
    if (!ebayClientId || !ebayClientSecret) {
      console.error('❌ Missing eBay credentials');
      return new Response(
        JSON.stringify({ error: 'eBay credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_auth_url') {
      // Generate OAuth URL
      const redirectUri = `https://preview--hustly-mvp3.lovable.app/ebay/callback`;
      const scopes = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly';
      
      const authUrl = `https://auth.ebay.com/oauth2/authorize?` +
        `client_id=${ebayClientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${state || 'default'}`;

      console.log('✅ Generated eBay OAuth URL');
      return new Response(
        JSON.stringify({ 
          status: 'success',
          auth_url: authUrl 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange_code') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Authorization code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Exchange code for token
      const redirectUri = `https://preview--hustly-mvp3.lovable.app/ebay/callback`;
      const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
      
      const credentials = btoa(`${ebayClientId}:${ebayClientSecret}`);
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ eBay token exchange failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Token exchange failed', details: errorText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      console.log('✅ eBay token exchange successful');

      // Get user info and account details
      const userResponse = await fetch('https://apiz.ebay.com/commerce/identity/v1/user/', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      let username = 'eBay User';
      let accountType = 'individual';
      let sellerLevel = null;
      let storeSubscription = null;
      let accountCapabilities = {};

      if (userResponse.ok) {
        const userData = await userResponse.json();
        username = userData.username || userData.email || 'eBay User';
      }

      // Detect account type using Account API
      try {
        const accountResponse = await fetch('https://api.ebay.com/sell/account/v1/user_program/get_user_programs', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
          }
        });

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          console.log('🔍 eBay Account Programs:', accountData);
          
          // Check for business policies eligibility
          const businessPoliciesProgram = accountData.programs?.find((p: any) => 
            p.programType === 'BUSINESS_POLICIES'
          );
          
          if (businessPoliciesProgram && businessPoliciesProgram.status === 'ENROLLED') {
            accountType = 'business';
            console.log('✅ Business account detected');
          } else {
            accountType = 'individual';
            console.log('✅ Individual account detected');
          }
          
          accountCapabilities = {
            businessPolicies: businessPoliciesProgram?.status === 'ENROLLED',
            programs: accountData.programs?.map((p: any) => ({
              type: p.programType,
              status: p.status
            }))
          };
        }
      } catch (error) {
        console.log('⚠️ Could not detect account type, defaulting to individual:', error.message);
        accountType = 'individual';
      }

      console.log('🎯 Account Detection Complete', {
        username,
        accountType,
        hasBusinessPolicies: accountCapabilities.businessPolicies
      });

      // Get current user from auth header
      const authHeader = req.headers.get('authorization');
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User not authenticated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store connection in database with account type detection
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      const { error: dbError } = await supabase
        .from('marketplace_accounts')
        .upsert({
          user_id: userId,
          platform: 'ebay',
          account_username: username,
          oauth_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          oauth_expires_at: expiresAt.toISOString(),
          is_connected: true,
          is_active: true,
          ebay_account_type: accountType,
          ebay_seller_level: sellerLevel,
          ebay_store_subscription: storeSubscription,
          ebay_account_capabilities: accountCapabilities
        }, {
          onConflict: 'user_id,platform'
        });

      if (dbError) {
        console.error('❌ Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to save connection', details: dbError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user profile with account type and proper settings
      const profileUpdates: any = {
        ebay_account_type: accountType
      };

      if (accountType === 'individual') {
        profileUpdates.ebay_payment_policy_id = 'INDIVIDUAL_DEFAULT_PAYMENT';
        profileUpdates.ebay_return_policy_id = 'INDIVIDUAL_DEFAULT_RETURN';
        profileUpdates.ebay_fulfillment_policy_id = 'INDIVIDUAL_DEFAULT_FULFILLMENT';
        profileUpdates.preferred_shipping_service = 'usps_priority';
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (profileError) {
        console.log('⚠️ Profile update warning:', profileError);
      }

      console.log('✅ eBay connection and profile updated');
      return new Response(
        JSON.stringify({ 
          status: 'success',
          success: true,
          username: username,
          accountType: accountType,
          hasBusinessPolicies: accountCapabilities.businessPolicies
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ eBay OAuth Modern Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
