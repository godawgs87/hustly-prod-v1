import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-POLICY-MANAGER] ${step}${detailsStr}`);
};

// eBay Account API Integration for Business Policies
class EbayAccountAPI {
  private accessToken: string = '';
  private baseUrl: string = 'https://api.ebay.com';
  private supabaseClient: any;
  private userId: string;

  constructor(supabaseClient: any, userId: string) {
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  async getUserEbayToken(): Promise<string> {
    // Get the user's eBay OAuth token from marketplace_accounts
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

    // Check if token is expired
    const expiryTime = new Date(account.oauth_expires_at);
    const now = new Date();
    
    if (expiryTime <= now) {
      throw new Error('eBay token has expired. Please reconnect your eBay account.');
    }

    this.accessToken = account.oauth_token;
    logStep('Using user eBay token', { 
      expiresAt: account.oauth_expires_at,
      username: account.account_username 
    });
    
    return this.accessToken;
  }

  async checkBusinessPolicyEligibility(): Promise<boolean> {
    if (!this.accessToken) await this.getUserEbayToken();

    try {
      logStep('Checking eBay business policy eligibility');
      const response = await fetch(`${this.baseUrl}/sell/account/v1/user_program/get_user_programs`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const isEligible = data.programs?.some((p: any) => 
          p.programType === 'BUSINESS_POLICIES' && p.status === 'ENROLLED'
        );
        
        logStep('Business policy eligibility check complete', { 
          isEligible,
          programs: data.programs?.map((p: any) => ({ type: p.programType, status: p.status }))
        });
        
        return isEligible || false;
      } else {
        const error = await response.text();
        logStep('Failed to check business policy eligibility', { 
          status: response.status,
          error: error.substring(0, 500)
        });
        return false;
      }
    } catch (error) {
      logStep('Error checking business policy eligibility', { error: error.message });
      return false;
    }
  }

  async getDefaultPolicyIds(): Promise<{payment: string, return: string, fulfillment: string}> {
    // For individual accounts, they typically can't create custom policies
    // Return standardized placeholders that the sync system will handle properly
    logStep('Setting individual account policy placeholders');
    
    const policies = {
      payment: 'INDIVIDUAL_DEFAULT_PAYMENT',
      return: 'INDIVIDUAL_DEFAULT_RETURN', 
      fulfillment: 'INDIVIDUAL_DEFAULT_FULFILLMENT'
    };
    
    logStep('Using individual account policy placeholders', {
      payment: policies.payment,
      return: policies.return,
      fulfillment: policies.fulfillment
    });
    
    return policies;
  }

  async fetchExistingPolicies(): Promise<{payment: string[], return: string[], fulfillment: string[]}> {
    if (!this.accessToken) await this.getUserEbayToken();

    const policies = { payment: [] as string[], return: [] as string[], fulfillment: [] as string[] };

    try {
      logStep('Starting to fetch existing eBay policies', { baseUrl: this.baseUrl });

      // Fetch payment policies
      logStep('Fetching payment policies...');
      const paymentResponse = await fetch(`${this.baseUrl}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        }
      });

      logStep('Payment policy response received', { 
        status: paymentResponse.status, 
        ok: paymentResponse.ok,
        statusText: paymentResponse.statusText 
      });

      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        policies.payment = paymentData.paymentPolicies?.map((p: any) => p.paymentPolicyId) || [];
        logStep('Payment policies processed successfully', { 
          count: policies.payment.length, 
          policyIds: policies.payment.map(id => id.substring(0, 12) + '...')
        });
      } else {
        const error = await paymentResponse.text();
        logStep('Payment policy fetch failed', { 
          status: paymentResponse.status, 
          statusText: paymentResponse.statusText,
          error: error.substring(0, 500) // Limit error text
        });
        
        // For individual accounts, payment policy fetch might fail - this is expected
        if (paymentResponse.status === 403 || paymentResponse.status === 404) {
          logStep('Payment policy access denied - likely individual account');
        } else {
          throw new Error(`Payment policy fetch failed: ${paymentResponse.status} ${error}`);
        }
      }

      // Fetch return policies
      logStep('Fetching return policies...');
      const returnResponse = await fetch(`${this.baseUrl}/sell/account/v1/return_policy?marketplace_id=EBAY_US`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        }
      });

      logStep('Return policy response received', { 
        status: returnResponse.status, 
        ok: returnResponse.ok,
        statusText: returnResponse.statusText 
      });

      if (returnResponse.ok) {
        const returnData = await returnResponse.json();
        policies.return = returnData.returnPolicies?.map((p: any) => p.returnPolicyId) || [];
        logStep('Return policies processed successfully', { 
          count: policies.return.length,
          policyIds: policies.return.map(id => id.substring(0, 12) + '...')
        });
      } else {
        const error = await returnResponse.text();
        logStep('Return policy fetch failed', { 
          status: returnResponse.status, 
          statusText: returnResponse.statusText,
          error: error.substring(0, 500)
        });
        
        if (returnResponse.status === 403 || returnResponse.status === 404) {
          logStep('Return policy access denied - likely individual account');
        } else {
          throw new Error(`Return policy fetch failed: ${returnResponse.status} ${error}`);
        }
      }

      // Fetch fulfillment policies
      logStep('Fetching fulfillment policies...');
      const fulfillmentResponse = await fetch(`${this.baseUrl}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        }
      });

      logStep('Fulfillment policy response received', { 
        status: fulfillmentResponse.status, 
        ok: fulfillmentResponse.ok,
        statusText: fulfillmentResponse.statusText 
      });

      if (fulfillmentResponse.ok) {
        const fulfillmentData = await fulfillmentResponse.json();
        policies.fulfillment = fulfillmentData.fulfillmentPolicies?.map((p: any) => p.fulfillmentPolicyId) || [];
        logStep('Fulfillment policies processed successfully', { 
          count: policies.fulfillment.length,
          policyIds: policies.fulfillment.map(id => id.substring(0, 12) + '...')
        });
      } else {
        const error = await fulfillmentResponse.text();
        logStep('Fulfillment policy fetch failed', { 
          status: fulfillmentResponse.status, 
          statusText: fulfillmentResponse.statusText,
          error: error.substring(0, 500)
        });
        
        if (fulfillmentResponse.status === 403 || fulfillmentResponse.status === 404) {
          logStep('Fulfillment policy access denied - likely individual account');
        } else {
          throw new Error(`Fulfillment policy fetch failed: ${fulfillmentResponse.status} ${error}`);
        }
      }

      logStep('Policy fetch complete', {
        paymentCount: policies.payment.length,
        returnCount: policies.return.length,
        fulfillmentCount: policies.fulfillment.length
      });

    } catch (error) {
      logStep('CRITICAL ERROR in fetchExistingPolicies', { 
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      throw new Error(`Failed to fetch existing eBay policies: ${error.message}`);
    }

    return policies;
  }

  async createPaymentPolicy(userProfile: any): Promise<string> {
    if (!this.accessToken) await this.getUserEbayToken();

    const paymentPolicyData = {
      name: `${userProfile.store_name || 'Store'} Payment Policy`,
      description: 'Automated payment policy for listings',
      marketplaceId: 'EBAY_US',
      categoryTypes: [
        {
          name: 'ALL_EXCLUDING_MOTORS_VEHICLES'
        }
      ],
      paymentMethods: [
        {
          paymentMethodType: 'PAYPAL',
          recipientAccountReference: {
            referenceId: userProfile.email || '',
            referenceType: 'PAYPAL_EMAIL'
          }
        },
        {
          paymentMethodType: 'CREDIT_CARD'
        }
      ],
      immediatePay: true,
      brands: [] // Required field for eBay payment policies
    };

    logStep('Creating payment policy', { name: paymentPolicyData.name });

    const response = await fetch(`${this.baseUrl}/sell/account/v1/payment_policy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify(paymentPolicyData)
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Payment policy creation failed', { error, status: response.status });
      
      // Check if this is a permissions error for individual accounts
      if (response.status === 403 || error.includes('not authorized') || error.includes('business account')) {
        logStep('Individual account detected - using default policy');
        throw new Error('INDIVIDUAL_ACCOUNT');
      }
      
      throw new Error(`Failed to create payment policy: ${error}`);
    }

    const data = await response.json();
    logStep('Payment policy created successfully', { policyId: data.paymentPolicyId });
    return data.paymentPolicyId;
  }

  async createReturnPolicy(userProfile: any): Promise<string> {
    if (!this.accessToken) await this.getUserEbayToken();

    const returnPolicyData = {
      name: `${userProfile.store_name || 'Store'} Return Policy`,
      description: 'Automated return policy for listings',
      marketplaceId: 'EBAY_US',
      categoryTypes: [
        {
          name: 'ALL_EXCLUDING_MOTORS_VEHICLES'
        }
      ],
      returnsAccepted: userProfile.accepts_returns !== false,
      returnPeriod: {
        value: userProfile.return_period_days || 30,
        unit: 'DAY'
      },
      returnMethod: userProfile.return_method || 'REPLACEMENT',
      returnShippingCostPayer: 'BUYER',
      refundMethod: 'MONEY_BACK'
    };

    logStep('Creating return policy', { name: returnPolicyData.name });

    const response = await fetch(`${this.baseUrl}/sell/account/v1/return_policy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify(returnPolicyData)
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Return policy creation failed', { error, status: response.status });
      
      // Check if this is a permissions error for individual accounts
      if (response.status === 403 || error.includes('not authorized') || error.includes('business account')) {
        logStep('Individual account detected - using default policy');
        throw new Error('INDIVIDUAL_ACCOUNT');
      }
      
      throw new Error(`Failed to create return policy: ${error}`);
    }

    const data = await response.json();
    logStep('Return policy created successfully', { policyId: data.returnPolicyId });
    return data.returnPolicyId;
  }

  async createFulfillmentPolicy(userProfile: any): Promise<string> {
    if (!this.accessToken) await this.getUserEbayToken();

    // Map user's preferred shipping service to eBay service codes
    const getEbayServiceCode = (preferred: string): string => {
      const serviceMapping: Record<string, string> = {
        'usps_priority': 'US_PriorityMail',
        'usps_ground': 'US_GroundAdvantage',
        'ups_ground': 'US_UPSGround',
        'fedex_ground': 'US_FedExGround'
      };
      return serviceMapping[preferred] || 'US_PriorityMail';
    };

    const serviceCode = getEbayServiceCode(userProfile.preferred_shipping_service || 'usps_priority');
    const domesticCost = userProfile.shipping_cost_domestic || 9.95;
    const additionalCost = userProfile.shipping_cost_additional || 2.00;

    const fulfillmentPolicyData = {
      name: `${userProfile.store_name || 'Store'} Fulfillment Policy`,
      description: 'Automated fulfillment policy for listings',
      marketplaceId: 'EBAY_US',
      categoryTypes: [
        {
          name: 'ALL_EXCLUDING_MOTORS_VEHICLES'
        }
      ],
      handlingTime: {
        value: userProfile.handling_time_days || 1,
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
    };

    // Add international shipping if enabled
    if (userProfile.international_shipping_enabled) {
      fulfillmentPolicyData.shippingOptions.push({
        optionType: 'INTERNATIONAL',
        costType: 'FLAT_RATE',
        shippingServices: [
          {
            serviceCode: 'US_PriorityMailInternational',
            shippingCost: {
              value: (domesticCost * 2.5).toFixed(2), // International typically costs more
              currency: 'USD'
            },
            additionalShippingCost: {
              value: (additionalCost * 1.5).toFixed(2),
              currency: 'USD'
            }
          }
        ]
      });

      // Add more regions for international shipping
      fulfillmentPolicyData.shipToLocations.regionIncluded.push(
        {
          regionName: 'Canada',
          regionType: 'COUNTRY'
        },
        {
          regionName: 'Europe',
          regionType: 'REGION'
        }
      );
    }

    logStep('Creating fulfillment policy', { 
      name: fulfillmentPolicyData.name,
      serviceCode,
      domesticCost,
      additionalCost,
      internationalEnabled: userProfile.international_shipping_enabled
    });

    const response = await fetch(`${this.baseUrl}/sell/account/v1/fulfillment_policy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify(fulfillmentPolicyData)
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('Fulfillment policy creation failed', { error, status: response.status });
      
      // Check if this is a permissions error for individual accounts
      if (response.status === 403 || error.includes('not authorized') || error.includes('business account')) {
        logStep('Individual account detected - using default policy');
        throw new Error('INDIVIDUAL_ACCOUNT');
      }
      
      throw new Error(`Failed to create fulfillment policy: ${error}`);
    }

    const data = await response.json();
    logStep('Fulfillment policy created successfully', { policyId: data.fulfillmentPolicyId });
    return data.fulfillmentPolicyId;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay policy manager started - basic initialization");

    // Initialize Supabase client
    let supabaseClient;
    try {
      logStep("Attempting to initialize Supabase client");
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      logStep("Supabase client initialized successfully");
    } catch (error) {
      logStep("CRITICAL: Failed to initialize Supabase client", { error: error.message, stack: error.stack });
      throw new Error(`Supabase initialization failed: ${error.message}`);
    }

    // Authenticate user
    logStep("Starting user authentication");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("CRITICAL: No authorization header provided");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    let userData, user;
    
    try {
      logStep("Attempting to authenticate user with token");
      const { data, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) {
        logStep("CRITICAL: User authentication failed", { error: userError.message, code: userError.status });
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      userData = data;
      user = userData.user;
      
      if (!user?.id) {
        logStep("CRITICAL: No user ID found in authenticated token");
        throw new Error("User not authenticated");
      }
      
      logStep("User authenticated successfully", { userId: user.id, email: user.email });
    } catch (error) {
      logStep("CRITICAL: User authentication failed completely", { error: error.message, stack: error.stack });
      throw error;
    }

    // Fetch user profile
    let userProfile;
    try {
      const { data, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        logStep("Failed to fetch user profile", { error: profileError.message });
        throw new Error(`User profile fetch failed: ${profileError.message}`);
      }
      
      if (!data) {
        logStep("User profile not found");
        throw new Error("User profile not found");
      }
      
      userProfile = data;
      logStep("User profile fetched", { profileId: userProfile.id });
    } catch (error) {
      logStep("User profile error", { error: error.message });
      throw error;
    }

    // Check eBay account type from marketplace account
    let ebayAccountType = userProfile.ebay_account_type || 'individual';
    
    try {
      const { data: marketplaceAccount } = await supabaseClient
        .from('marketplace_accounts')
        .select('ebay_account_type, ebay_account_capabilities')
        .eq('user_id', user.id)
        .eq('platform', 'ebay')
        .single();
      
      if (marketplaceAccount?.ebay_account_type) {
        ebayAccountType = marketplaceAccount.ebay_account_type;
      }
    } catch (error) {
      logStep('Could not fetch marketplace account, using profile account type', { error: error.message });
    }

    logStep('Account type determined', { 
      accountType: ebayAccountType, 
      profileAccountType: userProfile.ebay_account_type 
    });

    // For individual accounts, skip policy creation entirely
    if (ebayAccountType === 'individual') {
      logStep('Individual account detected - setting default policies without eBay API calls');
      
      const individualPolicies = {
        ebay_payment_policy_id: 'INDIVIDUAL_DEFAULT_PAYMENT',
        ebay_return_policy_id: 'INDIVIDUAL_DEFAULT_RETURN',
        ebay_fulfillment_policy_id: 'INDIVIDUAL_DEFAULT_FULFILLMENT'
      };

      // Update user profile with individual account defaults
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update(individualPolicies)
        .eq('id', user.id);

      if (updateError) {
        logStep('Failed to update individual account policies', { error: updateError.message });
        throw new Error(`Failed to update policies: ${updateError.message}`);
      }

      logStep('Individual account policies set successfully');
      
      return new Response(
        JSON.stringify({
          success: true,
          accountType: 'individual',
          message: 'Individual account policies configured',
          policies: individualPolicies
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Business account handling - continue with existing logic
    logStep('Business account detected - proceeding with policy creation/fetch');

    // Check if policies are placeholders (need to fetch real ones)
    const placeholderValues = [
      'DEFAULT_PAYMENT_POLICY', 'DEFAULT_RETURN_POLICY', 'DEFAULT_FULFILLMENT_POLICY',
      'INDIVIDUAL_PAYMENT_POLICY', 'INDIVIDUAL_RETURN_POLICY', 'INDIVIDUAL_FULFILLMENT_POLICY',
      'INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT',
      'MANUAL_ENTRY_REQUIRED_PAYMENT', 'MANUAL_ENTRY_REQUIRED_RETURN', 'MANUAL_ENTRY_REQUIRED_FULFILLMENT'
    ];
    
    const hasPlaceholderPolicies = placeholderValues.includes(userProfile.ebay_payment_policy_id) ||
                                   placeholderValues.includes(userProfile.ebay_return_policy_id) ||
                                   placeholderValues.includes(userProfile.ebay_fulfillment_policy_id) ||
                                   !userProfile.ebay_payment_policy_id ||
                                   !userProfile.ebay_return_policy_id ||
                                   !userProfile.ebay_fulfillment_policy_id;

    logStep("Policy check completed", {
      hasPlaceholderPolicies,
      paymentPolicyId: userProfile.ebay_payment_policy_id,
      returnPolicyId: userProfile.ebay_return_policy_id,
      fulfillmentPolicyId: userProfile.ebay_fulfillment_policy_id,
      detectedPlaceholders: {
        payment: placeholderValues.includes(userProfile.ebay_payment_policy_id),
        return: placeholderValues.includes(userProfile.ebay_return_policy_id),
        fulfillment: placeholderValues.includes(userProfile.ebay_fulfillment_policy_id)
      }
    });

    if (!hasPlaceholderPolicies) {
      logStep("Valid policies already exist - returning existing");
      return new Response(JSON.stringify({
        status: 'exists',
        payment_policy_id: userProfile.ebay_payment_policy_id,
        return_policy_id: userProfile.ebay_return_policy_id,
        fulfillment_policy_id: userProfile.ebay_fulfillment_policy_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check eBay account connection
    let ebayAccount;
    try {
      const { data, error } = await supabaseClient
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        logStep("Error checking eBay account", { error: error.message });
        throw new Error(`Failed to check eBay account: ${error.message}`);
      }
      
      ebayAccount = data;
      
      if (!ebayAccount) {
        logStep("No eBay account found");
        throw new Error("No eBay account connected. Please connect your eBay account first.");
      }
      
      logStep("eBay account found", { 
        accountId: ebayAccount.id,
        username: ebayAccount.account_username,
        expiresAt: ebayAccount.oauth_expires_at 
      });
    } catch (error) {
      logStep("eBay account check failed", { error: error.message });
      throw error;
    }

    // Check token expiry
    if (ebayAccount?.oauth_expires_at && new Date(ebayAccount.oauth_expires_at) < new Date()) {
      logStep("eBay OAuth token expired", { expiresAt: ebayAccount.oauth_expires_at });
      throw new Error("Your eBay connection has expired. Please reconnect your eBay account");
    }

    // Initialize eBay API
    let ebayApi;
    try {
      ebayApi = new EbayAccountAPI(supabaseClient, user.id);
      logStep("eBay API initialized");
    } catch (error) {
      logStep("Failed to initialize eBay API", { error: error.message });
      throw new Error(`eBay API initialization failed: ${error.message}`);
    }

    let paymentPolicyId: string;
    let returnPolicyId: string;
    let fulfillmentPolicyId: string;
    let isPersonalAccount = false;

    try {
      logStep("Checking eBay business policy eligibility");
      
      // Check if user is eligible for business policies
      const isBusinessEligible = await ebayApi.checkBusinessPolicyEligibility();
      logStep("Business policy eligibility result", { isBusinessEligible });
      
      if (!isBusinessEligible) {
        // Individual account - uses eBay's default system policies
        logStep("Individual account detected - using eBay default system policies");
        
        paymentPolicyId = 'EBAY_DEFAULT_PAYMENT';
        returnPolicyId = 'EBAY_DEFAULT_RETURN';
        fulfillmentPolicyId = 'EBAY_DEFAULT_FULFILLMENT';
        isPersonalAccount = true;
        
        logStep("Set individual account defaults", { 
          paymentPolicyId,
          returnPolicyId,
          fulfillmentPolicyId
        });
        
      } else {
        // Business account - try to fetch existing or create new policies
        logStep("Business account - attempting to fetch existing eBay policies");
        
        const existingPolicies = await ebayApi.fetchExistingPolicies();
        
        logStep("Policy fetch results", {
          paymentCount: existingPolicies.payment.length,
          returnCount: existingPolicies.return.length,
          fulfillmentCount: existingPolicies.fulfillment.length
        });
        
        if (existingPolicies.payment.length > 0 && 
            existingPolicies.return.length > 0 && 
            existingPolicies.fulfillment.length > 0) {
          
          // Use existing policies
          paymentPolicyId = existingPolicies.payment[0];
          returnPolicyId = existingPolicies.return[0];
          fulfillmentPolicyId = existingPolicies.fulfillment[0];
          
          logStep("Using existing business policies", { 
            paymentPolicyId: paymentPolicyId.substring(0, 12) + '...',
            returnPolicyId: returnPolicyId.substring(0, 12) + '...',
            fulfillmentPolicyId: fulfillmentPolicyId.substring(0, 12) + '...'
          });
          
        } else {
          logStep("No complete set of existing policies found - creating new business policies");
          
          // Create custom policies for business accounts
          paymentPolicyId = await ebayApi.createPaymentPolicy(userProfile);
          returnPolicyId = await ebayApi.createReturnPolicy(userProfile);
          fulfillmentPolicyId = await ebayApi.createFulfillmentPolicy(userProfile);
          
          logStep("Created custom eBay business policies successfully");
        }
      }
    } catch (error) {
      logStep("Policy configuration failed", { error: error.message });
      
      // If we still get policy creation errors, try using individual account defaults as fallback
      if (error.message.includes('Missing field brands') || 
          error.message.includes('not authorized') || 
          error.message.includes('business account')) {
        
        logStep("Falling back to individual account defaults due to policy creation failure");
        const defaultPolicies = await ebayApi.getDefaultPolicyIds();
        
        paymentPolicyId = defaultPolicies.payment;
        returnPolicyId = defaultPolicies.return;
        fulfillmentPolicyId = defaultPolicies.fulfillment;
        isPersonalAccount = true;
        
        logStep("Using fallback individual account policies", { 
          paymentPolicyId,
          returnPolicyId,
          fulfillmentPolicyId
        });
      } else {
        throw new Error(`Failed to configure eBay policies: ${error.message}`);
      }
    }

    // Update user profile with policy IDs
    try {
      logStep("Updating user profile with policy IDs", {
        paymentPolicyId: paymentPolicyId.substring(0, 12) + '...',
        returnPolicyId: returnPolicyId.substring(0, 12) + '...',
        fulfillmentPolicyId: fulfillmentPolicyId.substring(0, 12) + '...'
      });
      
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          ebay_payment_policy_id: paymentPolicyId,
          ebay_return_policy_id: returnPolicyId,
          ebay_fulfillment_policy_id: fulfillmentPolicyId,
          ebay_policies_created_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Failed to update user profile", { error: updateError.message });
        throw new Error(`Failed to save policy IDs: ${updateError.message}`);
      }
      
      logStep("User profile updated successfully");
    } catch (error) {
      logStep("Profile update error", { error: error.message });
      throw error;
    }

    logStep("eBay policy setup completed successfully", { 
      isPersonalAccount,
      paymentPolicyId: paymentPolicyId.substring(0, 12) + '...',
      returnPolicyId: returnPolicyId.substring(0, 12) + '...',
      fulfillmentPolicyId: fulfillmentPolicyId.substring(0, 12) + '...'
    });

    return new Response(JSON.stringify({
      status: 'success',
      payment_policy_id: paymentPolicyId,
      return_policy_id: returnPolicyId,
      fulfillment_policy_id: fulfillmentPolicyId,
      isPersonalAccount: isPersonalAccount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logStep("FATAL ERROR", { 
      message: errorMessage,
      stack: errorStack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
    });
    
    // Provide specific error messages based on error type
    let userFriendlyError = errorMessage;
    let statusCode = 500;
    
    if (errorMessage.includes('No active eBay account')) {
      userFriendlyError = 'eBay account not connected. Please connect your eBay account in Settings.';
      statusCode = 400;
    } else if (errorMessage.includes('token has expired') || errorMessage.includes('expired')) {
      userFriendlyError = 'eBay connection has expired. Please reconnect your eBay account in Settings.';
      statusCode = 401;
    } else if (errorMessage.includes('Missing field brands') || errorMessage.includes('not authorized')) {
      userFriendlyError = 'Unable to create custom business policies. Using eBay default policies instead.';
      statusCode = 400;
    } else if (errorMessage.includes('Authentication')) {
      userFriendlyError = 'Authentication failed. Please log in again.';
      statusCode = 401;
    } else if (errorMessage.includes('User profile not found')) {
      userFriendlyError = 'User profile not found. Please complete your profile setup.';
      statusCode = 400;
    } else if (errorMessage.includes('Failed to fetch existing eBay policies')) {
      userFriendlyError = 'Unable to fetch eBay policies. Please check your eBay connection and try again.';
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: userFriendlyError,
      technical_error: errorMessage,
      needs_reconnection: errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('not connected')
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});