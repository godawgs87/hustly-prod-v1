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
  private appAccessToken: string = '';
  private appAccessExpiresAt: number = 0;
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
      body: `grant_type=refresh_token&refresh_token=${account.refresh_token}`
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

  // Fetch and cache an application access token for Buy APIs (Browse)
  private async getAppAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.appAccessToken && this.appAccessExpiresAt && now < this.appAccessExpiresAt - 60_000) {
      return this.appAccessToken;
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope')
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`App token fetch failed: ${error}`);
    }

    const tokenData = await response.json();
    this.appAccessToken = tokenData.access_token;
    this.appAccessExpiresAt = now + (tokenData.expires_in * 1000);
    console.log('🔐 Obtained eBay APP token for Browse API', { expiresIn: tokenData.expires_in });
    return this.appAccessToken;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    console.log('🌐 Making eBay API request:', {
      endpoint,
      baseUrl: this.baseUrl,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    const usingBuyAPI = endpoint.startsWith('/buy/');
    const token = usingBuyAPI ? await this.getAppAccessToken() : await this.ensureValidToken();
    console.log('🔑 Token obtained:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 10) + '...' || 'none',
      tokenType: usingBuyAPI ? 'APP' : 'USER'
    });
    
    const headers = this.ebayHeaders(token);
    
    // Merge with any existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => headers.set(key, value));
    }

    if (usingBuyAPI) {
      // Ensure marketplace is set for Browse calls
      headers.set('X-EBAY-C-MARKETPLACE-ID', 'EBAY_US');
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

  async searchCompletedListings(params: {
    query: string;
    category?: string;
    brand?: string;
    condition?: string;
    limit?: number;
  }): Promise<any> {
    console.log('🔍 [Backend] Starting Browse API search for:', params.query);
    logStep('SEARCH_PARAMS', params);
    
    try {
      const endpoint = '/buy/browse/v1/item_summary/search';
      const targetLimit = Math.min(params.limit || 20, 50);
      
      // Analyze query components
      const queryAnalysis = this.analyzeSearchQuery(params.query);
      console.log('🧠 [Backend] Query analysis:', queryAnalysis);
      
      // Determine search strategies based on query components
      const searchStrategies: Array<{query: string, filters: string[], strategy: string}> = [];
      
      // Always include the original query as-is
      searchStrategies.push({
        query: params.query,
        filters: ['buyingOptions:{FIXED_PRICE}'],
        strategy: 'original'
      });
      
      // If we have part numbers, add part number searches
      if (queryAnalysis.partNumbers.length > 0) {
        // Part number alone (broadest for parts)
        searchStrategies.push({
          query: queryAnalysis.partNumbers[0],
          filters: ['buyingOptions:{FIXED_PRICE}'],
          strategy: 'part-number-only'
        });
        
        // Part number with brand if available
        if (params.brand || queryAnalysis.brand) {
          const brandName = params.brand || queryAnalysis.brand;
          searchStrategies.push({
            query: `${brandName} ${queryAnalysis.partNumbers[0]}`,
            filters: ['buyingOptions:{FIXED_PRICE}'],
            strategy: 'brand-part-number'
          });
        }
      }
      
      // If we have model/product info without part numbers, create model-focused search
      if (queryAnalysis.model && !queryAnalysis.partNumbers.length) {
        const modelQuery = [
          queryAnalysis.brand,
          queryAnalysis.model,
          queryAnalysis.productType
        ].filter(Boolean).join(' ');
        
        if (modelQuery && modelQuery !== params.query) {
          searchStrategies.push({
            query: modelQuery,
            filters: ['buyingOptions:{FIXED_PRICE}'],
            strategy: 'model-focused'
          });
        }
      }
      
      // Add category filter if provided
      if (params.category) {
        searchStrategies.forEach(s => s.filters.push(`categoryIds:{${params.category}}`));
      }
      
      // Execute searches in parallel for efficiency
      console.log('🚀 [Backend] Executing parallel searches:', searchStrategies.map(s => s.strategy));
      
      const searchPromises = searchStrategies.map(async (search) => {
        const queryParams = new URLSearchParams({
          q: search.query,
          filter: search.filters.join(','),
          limit: String(targetLimit),
          sort: 'price'
        });
        
        try {
          const response = await this.makeRequest(`${endpoint}?${queryParams}`, { method: 'GET' });
          return {
            strategy: search.strategy,
            query: search.query,
            items: response.itemSummaries || [],
            total: response.total || 0
          };
        } catch (error) {
          console.error(`❌ Search failed for strategy ${search.strategy}:`, error);
          return {
            strategy: search.strategy,
            query: search.query,
            items: [],
            total: 0
          };
        }
      });
      
      const searchResults = await Promise.all(searchPromises);
      
      // Log individual search results
      searchResults.forEach(result => {
        console.log(`� [Backend] ${result.strategy} results:`, {
          query: result.query,
          count: result.items.length,
          total: result.total
        });
      });
      
      // Merge and deduplicate results intelligently
      const mergedItems = this.mergeSearchResults(searchResults, params.condition);
      
      const result = {
        items: mergedItems.slice(0, targetLimit * 2), // Allow more results for better pricing
        total: mergedItems.length
      };
      
      console.log('✅ [Backend] Browse API search successful:', {
        strategiesUsed: searchStrategies.map(s => s.strategy),
        itemCount: result.items.length,
        total: result.total
      });
      
      logStep('SEARCH_COMPLETED', { 
        total: result.total, 
        itemCount: result.items.length,
        strategies: searchStrategies.map(s => s.strategy)
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [Backend] Browse API error:', error);
      logStep('SEARCH_ERROR', { 
        error: error.message, 
        stack: error.stack 
      });
      
      return {
        items: [],
        total: 0
      };
    }
  }
  
  private analyzeSearchQuery(query: string): {
    partNumbers: string[];
    brand?: string;
    model?: string;
    year?: string;
    productType?: string;
  } {
    // Extract part numbers (various formats) - EXCLUDE year ranges
    const partNumberPatterns = [
      // Standard automotive part numbers with letters and numbers separated by dashes
      /\b([A-Z][A-Z0-9]{1,}[-][A-Z0-9]{2,}(?:[-][A-Z0-9]{1,})*)\b/gi,  // NL3T-15K601-EC, 164-R8304
      // Part numbers starting with numbers then dash
      /\b(\d{3,}[-][A-Z][A-Z0-9]{2,})\b/gi,  // 164-R8304
      // Alphanumeric codes without dashes (but not pure numbers)
      /\b([A-Z]{2,}\d{4,}[A-Z0-9]*)\b/g  // AB1234X
    ];
    
    const partNumbers = new Set<string>();
    partNumberPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(m => {
          // Filter out year ranges (e.g., 2022-2025)
          if (!/^\d{4}-\d{4}$/.test(m)) {
            partNumbers.add(m.toUpperCase());
          }
        });
      }
    });
    
    // Extract year (4 digits) or year range
    const yearMatch = query.match(/\b((?:19|20)\d{2})(?:-(?:19|20)\d{2})?\b/);
    const year = yearMatch ? yearMatch[1] : undefined;
    
    // Common automotive brands (extend as needed)
    const brands = ['Ford', 'Chevy', 'Chevrolet', 'GMC', 'Toyota', 'Honda', 'Nissan', 'BMW', 'Mercedes', 'Audi', 'VW', 'Volkswagen', 'Dodge', 'Ram', 'Jeep', 'Chrysler'];
    const brandPattern = new RegExp(`\\b(${brands.join('|')})\\b`, 'i');
    const brandMatch = query.match(brandPattern);
    const brand = brandMatch ? brandMatch[1] : undefined;
    
    // Extract model (F-150, Camry, etc.) - be more specific
    const modelPatterns = [
      /\b(F-\d{3})\b/i,  // F-150, F-250
      /\b([A-Z][-]?\d{3,4})\b/,  // C-300, E350
      /\b(Lightning|Raptor|King Ranch|Platinum|Limited|Lariat)\b/i,  // Trim levels
      /\b(Camry|Corolla|Civic|Accord|Altima|Sentra|Malibu|Cruze|Focus|Fusion)\b/i  // Common models
    ];
    
    let model: string | undefined;
    for (const pattern of modelPatterns) {
      const match = query.match(pattern);
      if (match) {
        model = match[1];
        break;
      }
    }
    
    // Product type detection
    const productTypes = ['key fob', 'key', 'remote', 'sensor', 'module', 'switch', 'relay', 'filter', 'brake', 'rotor'];
    const productTypePattern = new RegExp(`\\b(${productTypes.join('|')})s?\\b`, 'i');
    const productMatch = query.match(productTypePattern);
    const productType = productMatch ? productMatch[1] : undefined;
    
    console.log('🔍 [Backend] Query analysis debug:', {
      query,
      extractedPartNumbers: Array.from(partNumbers),
      year,
      brand,
      model,
      productType
    });
    
    return {
      partNumbers: Array.from(partNumbers),
      brand,
      model,
      year,
      productType
    };
  }
  
  private mergeSearchResults(
    searchResults: Array<{strategy: string; items: any[]; total: number}>,
    preferredCondition?: string
  ): any[] {
    const itemMap = new Map<string, any>();
    const itemScores = new Map<string, number>();
    
    // Score items based on which searches found them
    searchResults.forEach((result, index) => {
      result.items.forEach((item: any) => {
        const mappedItem = {
          id: item.itemId,
          title: item.title,
          price: item.price?.value || 0,
          currency: item.price?.currency || 'USD',
          condition: item.condition,
          location: item.itemLocation?.country,
          url: item.itemWebUrl,
          image: item.image?.imageUrl,
          endTime: item.itemEndDate,
          // Extract eBay category information
          categoryId: item.leafCategoryIds?.[0] || item.categoryId,
          categoryPath: item.categoryPath,
          categories: item.categories
        };
        
        if (!itemMap.has(mappedItem.id)) {
          itemMap.set(mappedItem.id, mappedItem);
          itemScores.set(mappedItem.id, 0);
        }
        
        // Score based on strategy priority (original query gets highest score)
        let score = 0;
        switch(result.strategy) {
          case 'original': score = 100; break;
          case 'brand-part-number': score = 80; break;
          case 'part-number-only': score = 60; break;
          case 'model-focused': score = 40; break;
          default: score = 20;
        }
        
        // Bonus for condition match
        if (preferredCondition && item.condition === preferredCondition) {
          score += 10;
        }
        
        itemScores.set(mappedItem.id, (itemScores.get(mappedItem.id) || 0) + score);
      });
    });
    
    // Sort by score (relevance) then by price
    const sortedItems = Array.from(itemMap.values()).sort((a, b) => {
      const scoreA = itemScores.get(a.id) || 0;
      const scoreB = itemScores.get(b.id) || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.price - b.price;
    });
    
    return sortedItems;
  }

  async getSuggestedPrice(searchResults: any): Promise<{ suggestedPrice: number; confidence: string; analysis: any; ebayCategory?: { id: string; path?: string } }> {
    logStep('GET_SUGGESTED_PRICE', { itemCount: searchResults.items?.length || 0 });
    
    if (!searchResults.items || searchResults.items.length === 0) {
      return {
        suggestedPrice: 0,
        confidence: 'low',
        analysis: { message: 'No comparable listings found' }
      };
    }
    
    // Extract eBay category from comparables
    let ebayCategory: { id: string; path?: string } | undefined;
    const categoryFrequency = new Map<string, number>();
    
    searchResults.items.forEach((item: any) => {
      if (item.categoryId) {
        const count = categoryFrequency.get(item.categoryId) || 0;
        categoryFrequency.set(item.categoryId, count + 1);
      }
    });
    
    // Get most frequent category
    if (categoryFrequency.size > 0) {
      const sortedCategories = Array.from(categoryFrequency.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const mostFrequentCategoryId = sortedCategories[0][0];
      const itemWithCategory = searchResults.items.find((item: any) => item.categoryId === mostFrequentCategoryId);
      
      ebayCategory = {
        id: mostFrequentCategoryId,
        path: itemWithCategory?.categoryPath
      };
      
      console.log('📦 [Backend] Extracted eBay category:', ebayCategory);
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
    
    logStep('PRICE_SUGGESTION_COMPLETE', { suggestedPrice, confidence, analysis, ebayCategory });
    
    return { suggestedPrice, confidence, analysis, ebayCategory };
  }

  async researchItemPrice(params: any): Promise<any> {
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
      
      searchData = await this.searchCompletedListings(searchParams);
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
      priceData = await this.getSuggestedPrice(searchData);
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
        return await ebayClient.researchItemPrice(params);

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