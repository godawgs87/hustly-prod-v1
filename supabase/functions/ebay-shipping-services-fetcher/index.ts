import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EbayShippingService {
  serviceCode: string;
  serviceName: string;
  isDomestic: boolean;
  isInternational: boolean;
  category: string;
  costType: string;
}

interface EbayServiceDetails {
  ShippingService: Array<{
    ShippingServiceID: string;
    ShippingServiceName: string;
    ValidForSellingFlow: boolean;
    InternationalService: boolean;
    ShippingCategory: string;
    ShippingPackageDetails?: {
      ShippingPackage: string;
    };
  }>;
}

class EbayTradingAPIClient {
  private devId: string;
  private appId: string;
  private certId: string;
  private token: string;
  private baseUrl = 'https://api.ebay.com/ws/api.dll';

  constructor(devId: string, appId: string, certId: string, token: string) {
    this.devId = devId;
    this.appId = appId;
    this.certId = certId;
    this.token = token;
  }

  private buildHeaders() {
    return {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-DEV-NAME': this.devId,
      'X-EBAY-API-APP-NAME': this.appId,
      'X-EBAY-API-CERT-NAME': this.certId,
      'X-EBAY-API-CALL-NAME': 'GeteBayDetails',
      'X-EBAY-API-SITEID': '0', // US site
    };
  }

  private buildRequestXML() {
    return `<?xml version="1.0" encoding="utf-8"?>
<GeteBayDetailsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.token}</eBayAuthToken>
  </RequesterCredentials>
  <DetailName>ShippingServiceDetails</DetailName>
</GeteBayDetailsRequest>`;
  }

  async getShippingServiceDetails(): Promise<EbayServiceDetails> {
    console.log('[EBAY-SERVICES-FETCHER] 🚀 Fetching shipping service details from eBay Trading API');
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildRequestXML(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EBAY-SERVICES-FETCHER] ❌ eBay API error response:', errorText);
        throw new Error(`eBay API request failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      console.log('[EBAY-SERVICES-FETCHER] 📦 Received XML response from eBay (first 1000 chars):', xmlText.substring(0, 1000));

      // Check for eBay API errors in response
      if (xmlText.includes('<Errors>')) {
        console.error('[EBAY-SERVICES-FETCHER] ❌ eBay API returned errors in XML response:', xmlText);
        throw new Error('eBay API returned error in response');
      }

      // Parse XML response (basic parsing - in production would use proper XML parser)
      const services = this.parseShippingServices(xmlText);
      
      console.log('[EBAY-SERVICES-FETCHER] ✅ Successfully parsed shipping services:', {
        serviceCount: services.ShippingService.length
      });

      // If no services found, add fallback services for individual accounts
      if (services.ShippingService.length === 0) {
        console.log('[EBAY-SERVICES-FETCHER] ⚠️ No services from API, using fallback services');
        return this.getFallbackServices();
      }

      return services;
    } catch (error) {
      console.error('[EBAY-SERVICES-FETCHER] ❌ Error fetching shipping services:', error);
      // Return fallback services instead of throwing
      console.log('[EBAY-SERVICES-FETCHER] 🔄 Returning fallback services due to API error');
      return this.getFallbackServices();
    }
  }

  private getFallbackServices(): EbayServiceDetails {
    console.log('[EBAY-SERVICES-FETCHER] 📋 Using fallback shipping services for individual accounts');
    return {
      ShippingService: [
        {
          ShippingServiceID: 'USPSGround',
          ShippingServiceName: 'USPS Ground Advantage',
          ValidForSellingFlow: true,
          InternationalService: false,
          ShippingCategory: 'Standard'
        },
        {
          ShippingServiceID: 'USPSPriority',
          ShippingServiceName: 'USPS Priority Mail',
          ValidForSellingFlow: true,
          InternationalService: false,
          ShippingCategory: 'Expedited'
        },
        {
          ShippingServiceID: 'USPSPriorityFlatRateBox',
          ShippingServiceName: 'USPS Priority Mail Flat Rate Box',
          ValidForSellingFlow: true,
          InternationalService: false,
          ShippingCategory: 'Expedited'
        },
        {
          ShippingServiceID: 'USPSPriorityFlatRateEnvelope',
          ShippingServiceName: 'USPS Priority Mail Flat Rate Envelope',
          ValidForSellingFlow: true,
          InternationalService: false,
          ShippingCategory: 'Expedited'
        },
        {
          ShippingServiceID: 'USPSPriorityExpress',
          ShippingServiceName: 'USPS Priority Mail Express',
          ValidForSellingFlow: true,
          InternationalService: false,
          ShippingCategory: 'Expedited'
        }
      ]
    };
  }

  private parseShippingServices(xmlText: string): EbayServiceDetails {
    // Basic XML parsing - extract shipping services
    const services: EbayServiceDetails = { ShippingService: [] };
    
    // Find all ShippingService elements
    const serviceMatches = xmlText.match(/<ShippingService>[\s\S]*?<\/ShippingService>/g);
    
    if (!serviceMatches) {
      console.log('[EBAY-SERVICES-FETCHER] ⚠️ No shipping services found in response');
      return services;
    }

    for (const serviceXml of serviceMatches) {
      // Extract service details
      const serviceId = this.extractXmlValue(serviceXml, 'ShippingServiceID');
      const serviceName = this.extractXmlValue(serviceXml, 'ShippingServiceName');
      const validForSelling = this.extractXmlValue(serviceXml, 'ValidForSellingFlow') === 'true';
      const isInternational = this.extractXmlValue(serviceXml, 'InternationalService') === 'true';
      const category = this.extractXmlValue(serviceXml, 'ShippingCategory') || 'Standard';

      if (serviceId && serviceName && validForSelling) {
        services.ShippingService.push({
          ShippingServiceID: serviceId,
          ShippingServiceName: serviceName,
          ValidForSellingFlow: validForSelling,
          InternationalService: isInternational,
          ShippingCategory: category,
        });
      }
    }

    console.log('[EBAY-SERVICES-FETCHER] 📋 Parsed services:', {
      total: services.ShippingService.length,
      domestic: services.ShippingService.filter(s => !s.InternationalService).length,
      international: services.ShippingService.filter(s => s.InternationalService).length
    });

    return services;
  }

  private extractXmlValue(xml: string, tagName: string): string {
    const match = xml.match(new RegExp(`<${tagName}>(.*?)<\/${tagName}>`));
    return match ? match[1] : '';
  }
}

async function refreshShippingServices(supabase: any, marketplaceAccount: any): Promise<EbayShippingService[]> {
  console.log('[EBAY-SERVICES-FETCHER] 🔄 Starting refresh of shipping services');

  const devId = Deno.env.get('EBAY_DEV_ID');
  const appId = Deno.env.get('EBAY_CLIENT_ID');
  const certId = Deno.env.get('EBAY_CLIENT_SECRET');

  console.log('[EBAY-SERVICES-FETCHER] 🔍 CRITICAL DEBUG - Credential check:', {
    hasDevId: !!devId,
    hasAppId: !!appId,
    hasCertId: !!certId,
    devIdFirst4: devId ? devId.substring(0, 4) + '...' : 'MISSING',
    appIdFirst4: appId ? appId.substring(0, 4) + '...' : 'MISSING'
  });

  if (!devId || !appId || !certId) {
    const missingCreds = [];
    if (!devId) missingCreds.push('EBAY_DEV_ID');
    if (!appId) missingCreds.push('EBAY_CLIENT_ID'); 
    if (!certId) missingCreds.push('EBAY_CLIENT_SECRET');
    throw new Error(`Missing eBay API credentials: ${missingCreds.join(', ')}`);
  }

  console.log('[EBAY-SERVICES-FETCHER] 🔍 CRITICAL DEBUG - Marketplace account check:', {
    hasOauthToken: !!marketplaceAccount.oauth_token,
    tokenFirst10: marketplaceAccount.oauth_token ? marketplaceAccount.oauth_token.substring(0, 10) + '...' : 'MISSING',
    accountUsername: marketplaceAccount.account_username,
    sellerLevel: marketplaceAccount.seller_level
  });

  if (!marketplaceAccount.oauth_token) {
    throw new Error('No eBay auth token available');
  }

  const tradingAPI = new EbayTradingAPIClient(devId, appId, certId, marketplaceAccount.oauth_token);
  
  try {
    // Fetch services from eBay
    const serviceDetails = await tradingAPI.getShippingServiceDetails();
    
    // Transform to our format
    const services: EbayShippingService[] = serviceDetails.ShippingService.map(service => ({
      serviceCode: service.ShippingServiceID,
      serviceName: service.ShippingServiceName,
      isDomestic: !service.InternationalService,
      isInternational: service.InternationalService,
      category: service.ShippingCategory.toLowerCase(),
      costType: 'flat', // Default - could be enhanced
    }));

    // Determine account type
    const accountType = marketplaceAccount.seller_level === 'Top Rated' ? 'business' : 'individual';

    console.log('[EBAY-SERVICES-FETCHER] 💾 Storing services in database:', {
      serviceCount: services.length,
      accountType
    });

    // Clear existing services for this account type
    await supabase
      .from('ebay_valid_services')
      .delete()
      .eq('account_type', accountType);

    // Insert new services
    const insertData = services.map(service => ({
      service_code: service.serviceCode,
      service_name: service.serviceName,
      is_domestic: service.isDomestic,
      is_international: service.isInternational,
      account_type: accountType,
      category: service.category,
      cost_type: service.costType,
      last_validated: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('ebay_valid_services')
      .insert(insertData);

    if (insertError) {
      throw new Error(`Failed to store services: ${insertError.message}`);
    }

    console.log('[EBAY-SERVICES-FETCHER] ✅ Successfully stored shipping services');
    return services;

  } catch (error) {
    console.error('[EBAY-SERVICES-FETCHER] ❌ Error in refresh process:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, forceRefresh = false } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user's eBay account
    const { data: marketplaceAccount, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'ebay')
      .eq('is_connected', true)
      .maybeSingle();

    if (accountError || !marketplaceAccount) {
      throw new Error('No connected eBay account found');
    }

    // Check if we need to refresh (cache expired or force refresh)
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - 24); // 24 hour cache

    const { data: existingServices, error: servicesError } = await supabase
      .from('ebay_valid_services')
      .select('*')
      .gte('last_validated', cacheExpiry.toISOString())
      .eq('is_active', true);

    if (!forceRefresh && existingServices && existingServices.length > 0) {
      console.log('[EBAY-SERVICES-FETCHER] 📋 Using cached services:', {
        serviceCount: existingServices.length
      });
      
      return new Response(JSON.stringify({
        success: true,
        services: existingServices,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh services from eBay
    const services = await refreshShippingServices(supabase, marketplaceAccount);

    return new Response(JSON.stringify({
      success: true,
      services,
      cached: false,
      refreshed: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EBAY-SERVICES-FETCHER] ❌ Function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});