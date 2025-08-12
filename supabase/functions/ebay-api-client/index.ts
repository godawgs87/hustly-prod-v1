import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-API-CLIENT] ${step}${detailsStr}`);
};

// Centralized eBay API Client
export class EbayAPIClient {
  private accessToken: string = '';
  baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private supabaseClient: any;
  private userId: string;

  constructor(isSandbox: boolean = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.clientId = Deno.env.get('EBAY_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('EBAY_CLIENT_SECRET') || '';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
    
    // Debug eBay credentials
    console.log('🔑 eBay API Configuration:', {
      baseUrl: this.baseUrl,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      clientIdLength: this.clientId.length,
      userId: this.userId
    });
  }

  // Centralized header utility
  ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
    return headers;
  }

  async ensureValidToken(): Promise<string> {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('*')
      .eq('platform', 'ebay')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      throw new Error('No active eBay account found');
    }

    const expiryTime = new Date(account.oauth_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (timeUntilExpiry <= thirtyMinutes) {
      logStep('Token expired, refreshing');
      return await this.refreshToken(account);
    }

    this.accessToken = account.oauth_token;
    return this.accessToken;
  }

  private async refreshToken(account: any): Promise<string> {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${account.refresh_token}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/buy.browse`
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    await this.supabaseClient
      .from('marketplace_accounts')
      .update({
        oauth_token: tokenData.access_token,
        oauth_expires_at: expiresAt.toISOString(),
        refresh_token: tokenData.refresh_token || account.refresh_token,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    this.accessToken = tokenData.access_token;
    return this.accessToken;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    console.log('🌐 Making eBay API request:', {
      endpoint,
      baseUrl: this.baseUrl,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    const token = await this.ensureValidToken();
    console.log('🔑 Token obtained:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 10) + '...' || 'none'
    });
    
    const headers = this.ebayHeaders(token);
    
    // Merge with any existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => headers.set(key, value));
    }

    console.log('📡 Making fetch request to:', `${this.baseUrl}${endpoint}`);
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    console.log('📥 eBay API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.log('❌ eBay API Error (JSON):', errorDetails);
      } catch {
        errorDetails = await response.text();
        console.log('❌ eBay API Error (Text):', errorDetails);
      }
      throw new Error(`eBay API Error: ${JSON.stringify(errorDetails)}`);
    }

    const result = await response.json();
    console.log('✅ eBay API Success:', {
      hasResult: !!result,
      resultKeys: Object.keys(result || {}),
      total: result?.total,
      itemSummariesLength: result?.itemSummaries?.length
    });
    
    return result;
  }

  // Browse API methods for price research
  async searchCompletedListings(params: {
    query: string;
    category?: string;
    brand?: string;
    condition?: string;
    limit?: number;
  }): Promise<any> {
    console.log('🔍 [Backend] searchCompletedListings called with:', params);
    logStep('SEARCH_COMPLETED_LISTINGS', { query: params.query, category: params.category });
    
    // Use the actual query from frontend parameter extraction
    const query = params.query || 'generic item';
    console.log('🔍 [Backend] Using query:', query);
    
    // Build search parameters
    const limitParam = `&limit=${Math.min(params.limit || 20, 50)}`;
    let endpoint = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}${limitParam}`;
    
    // Add brand filter if provided
    if (params.brand) {
      endpoint += `&aspect_filter=Brand:${encodeURIComponent(params.brand)}`;
    }
    
    // Add condition filter if provided
    if (params.condition && params.condition !== 'Any') {
      const conditionMap: { [key: string]: string } = {
        'New': '1000',
        'Used': '3000',
        'Refurbished': '2000'
      };
      const conditionId = conditionMap[params.condition];
      if (conditionId) {
        endpoint += `&filter=conditionIds:{${conditionId}}`;
      }
    }
    
    try {
      console.log('🌐 [Backend] Final eBay API endpoint:', endpoint);
      logStep('MAKING_EBAY_REQUEST', { endpoint, query: params.query });
      const result = await this.makeRequest(endpoint);
      console.log('📊 [Backend] eBay API raw result:', {
        total: result.total,
        itemCount: result.itemSummaries?.length || 0,
        hasItems: !!result.itemSummaries
      });
      
      // Progressive fallback search strategy if no results
      if (result.total === 0) {
        console.log('🔄 [Backend] No results with specific query, trying progressive fallback searches');
        
        // Try 1: Remove year range and part numbers, keep core terms
        const coreTerms = params.query
          .replace(/\b(OEM|Genuine|Original)\b/gi, '')
          .replace(/\b\d{4}-?\d{4}\b/g, '') // Remove year ranges
          .replace(/\b[A-Z0-9]{8,}\b/g, '') // Remove long part numbers
          .replace(/\s+/g, ' ')
          .trim();
        
        if (coreTerms && coreTerms !== params.query) {
          console.log('🔄 [Backend] Fallback 1: Core terms search -', coreTerms);
          const fallback1Endpoint = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(coreTerms)}&limit=20`;
          const fallback1Result = await this.makeRequest(fallback1Endpoint);
          console.log('📊 [Backend] Fallback 1 result:', { total: fallback1Result.total });
          
          if (fallback1Result.total > 0) {
            return {
              items: fallback1Result.itemSummaries || [],
              total: fallback1Result.total,
              searchQuery: coreTerms,
              searchType: 'core_terms_fallback'
            };
          }
        }
        
        // Try 2: Brand + key product type only
        if (params.brand) {
          const brandQuery = `${params.brand} key fob`;
          console.log('🔄 [Backend] Fallback 2: Brand + product type -', brandQuery);
          const fallback2Endpoint = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(brandQuery)}&limit=20`;
          const fallback2Result = await this.makeRequest(fallback2Endpoint);
          console.log('📊 [Backend] Fallback 2 result:', { total: fallback2Result.total });
          
          if (fallback2Result.total > 0) {
            return {
              items: fallback2Result.itemSummaries || [],
              total: fallback2Result.total,
              searchQuery: brandQuery,
              searchType: 'brand_product_fallback'
            };
          }
        }
        
        // Try 3: Just the product type (last resort)
        const productType = 'key fob';
        console.log('🔄 [Backend] Fallback 3: Product type only -', productType);
        const fallback3Endpoint = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(productType)}&limit=20`;
        const fallback3Result = await this.makeRequest(fallback3Endpoint);
        console.log('📊 [Backend] Fallback 3 result:', { total: fallback3Result.total });
        
        if (fallback3Result.total > 0) {
          return {
            items: fallback3Result.itemSummaries || [],
            total: fallback3Result.total,
            searchQuery: productType,
            searchType: 'product_type_fallback'
          };
        }
      }
      
      logStep('EBAY_RAW_RESPONSE', { 
        total: result.total, 
        itemSummariesLength: result.itemSummaries?.length,
        hasItemSummaries: !!result.itemSummaries,
        resultKeys: Object.keys(result),
        fullResult: JSON.stringify(result).substring(0, 500) // First 500 chars
      });
      
      // Process and format results for price research
      const processedResults = {
        total: result.total || 0,
        items: (result.itemSummaries || []).map((item: any) => ({
          title: item.title,
          price: item.price?.value || null,
          currency: item.price?.currency || 'USD',
          condition: item.condition,
          image: item.image?.imageUrl || null,
          itemId: item.itemId,
          seller: item.seller?.username || null,
          shippingCost: item.shippingOptions?.[0]?.shippingCost?.value || null,
          location: item.itemLocation?.country || null,
          soldDate: item.lastModifiedDate || null,
          salePrice: item.price?.value || null
        }))
      };
      
      logStep('SEARCH_COMPLETED_SUCCESS', { 
        total: processedResults.total, 
        itemCount: processedResults.items.length,
        endpoint: endpoint,
        processedItems: processedResults.items.slice(0, 2) // First 2 items for debugging
      });
      
      return processedResults;
      
    } catch (error) {
      logStep('SEARCH_COMPLETED_ERROR', { error: error.message, endpoint: endpoint });
      throw error;
    }
  }

  async getSuggestedPrice(searchResults: any): Promise<{ suggestedPrice: number; confidence: string; analysis: any }> {
    logStep('GET_SUGGESTED_PRICE', { itemCount: searchResults.items?.length || 0 });
    
    if (!searchResults.items || searchResults.items.length === 0) {
      return {
        suggestedPrice: 0,
        confidence: 'low',
        analysis: { message: 'No comparable listings found' }
      };
    }
    
    // Extract and validate prices with enhanced logging
    console.log('💰 [Backend] Raw search results for price analysis:', {
      totalItems: searchResults.items.length,
      firstFewItems: searchResults.items.slice(0, 3).map((item: any) => ({
        title: item.title,
        price: item.price,
        priceType: typeof item.price
      }))
    });
    
    const prices = searchResults.items
      .map((item: any) => {
        // Handle both number and string prices
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price);
        console.log('💰 [Backend] Processing price:', { original: item.price, parsed: price, title: item.title?.substring(0, 50) });
        return price;
      })
      .filter((price: number) => !isNaN(price) && price > 0)
      .sort((a: number, b: number) => a - b);
    
    console.log('💰 [Backend] Valid prices extracted:', { count: prices.length, prices: prices.slice(0, 10) });
    
    if (prices.length === 0) {
      return {
        suggestedPrice: 0,
        confidence: 'low',
        analysis: { message: 'No valid prices found in comparable listings' }
      };
    }
    
    // Calculate price statistics with enhanced stability
    const min = prices[0];
    const max = prices[prices.length - 1];
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Calculate median more accurately (handle both odd and even lengths)
    let median;
    if (prices.length % 2 === 0) {
      // Even number of prices - average of two middle values
      const mid1 = prices[Math.floor(prices.length / 2) - 1];
      const mid2 = prices[Math.floor(prices.length / 2)];
      median = (mid1 + mid2) / 2;
    } else {
      // Odd number of prices - middle value
      median = prices[Math.floor(prices.length / 2)];
    }
    
    // Enhanced pricing algorithm for consistency and balance
    // Use balanced approach: 50% median, 50% average for more stable pricing
    const weightedPrice = (median * 0.5) + (average * 0.5);
    
    // Apply consistent competitive discount based on sample size and variance
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / average;
    
    let competitiveDiscount = 0.02; // Default 2% discount for consistency
    if (coefficientOfVariation > 0.5) {
      // High variance - be slightly more aggressive
      competitiveDiscount = 0.04;
    } else if (coefficientOfVariation < 0.2) {
      // Low variance - minimal discount
      competitiveDiscount = 0.01;
    }
    
    const suggestedPrice = Math.round(weightedPrice * (1 - competitiveDiscount) * 100) / 100;
    
    console.log('💰 [Backend] Price calculation details:', {
      sampleSize: prices.length,
      min, max, median, average, weightedPrice,
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
      competitiveDiscount,
      suggestedPrice
    });
    
    // Determine confidence based on sample size and price variance
    let confidence = 'low';
    if (prices.length >= 10) {
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / average;
      
      if (coefficientOfVariation < 0.3) {
        confidence = 'high';
      } else if (coefficientOfVariation < 0.5) {
        confidence = 'medium';
      }
    } else if (prices.length >= 5) {
      confidence = 'medium';
    }
    
    const analysis = {
      sampleSize: prices.length,
      priceRange: { min, max },
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      recommendation: 'Price set 5% below median for competitive advantage'
    };
    
    logStep('PRICE_SUGGESTION_COMPLETE', { suggestedPrice, confidence, analysis });
    
    return { suggestedPrice, confidence, analysis };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    if (!user?.id) throw new Error("User not authenticated");

    const requestData = await req.json();
    const { action, ...params } = requestData;

    const ebayClient = new EbayAPIClient(false, supabaseClient, user.id);

    switch (action) {
      case 'test_connection':
        await ebayClient.ensureValidToken();
        return new Response(JSON.stringify({ status: 'success', message: 'eBay connection valid' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'make_request':
        const result = await ebayClient.makeRequest(params.endpoint, params.options);
        return new Response(JSON.stringify({ status: 'success', data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'search_completed_listings':
        const searchResults = await ebayClient.searchCompletedListings({
          query: params.query,
          category: params.category,
          brand: params.brand,
          condition: params.condition,
          limit: params.limit
        });
        return new Response(JSON.stringify({ status: 'success', data: searchResults }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'get_price_suggestion':
        const priceAnalysis = await ebayClient.getSuggestedPrice(params.searchResults);
        return new Response(JSON.stringify({ status: 'success', data: priceAnalysis }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'research_item_price':
        // Combined action: search + analyze in one call
        console.log('🔍 [Backend] RECEIVED PARAMS:', {
          query: params.query,
          brand: params.brand,
          condition: params.condition,
          category: params.category,
          limit: params.limit,
          allParams: params
        });
        
        logStep('RESEARCH_ITEM_PRICE_START', { query: params.query, brand: params.brand, condition: params.condition });
        
        // Validate required parameters
        if (!params.query || typeof params.query !== 'string') {
          throw new Error('Query parameter is required and must be a string');
        }
        
        let searchData;
        try {
          const searchParams = {
            query: params.query.trim(),
            category: params.category || undefined,
            brand: params.brand || undefined,
            condition: params.condition || undefined,
            limit: Math.min(params.limit || 20, 50) // Cap at 50 to prevent API overload
          };
          
          logStep('SEARCH_PARAMS', searchParams);
          
          searchData = await ebayClient.searchCompletedListings(searchParams);
          logStep('SEARCH_COMPLETED', { total: searchData.total, itemCount: searchData.items?.length });
        } catch (searchError) {
          logStep('SEARCH_ERROR', { error: searchError.message, stack: searchError.stack });
          // Return partial success with error info instead of throwing
          return new Response(JSON.stringify({ 
            status: 'partial_success', 
            data: {
              searchResults: { items: [], total: 0 },
              priceAnalysis: { suggestedPrice: 0, priceRange: { min: 0, max: 0 } },
              error: searchError.message
            }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        let priceData;
        try {
          priceData = await ebayClient.getSuggestedPrice(searchData);
        } catch (priceError) {
          logStep('PRICE_ANALYSIS_ERROR', { error: priceError.message });
          priceData = { suggestedPrice: 0, priceRange: { min: 0, max: 0 } };
        }
        
        return new Response(JSON.stringify({ 
          status: 'success', 
          data: {
            searchResults: searchData,
            priceAnalysis: priceData
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});