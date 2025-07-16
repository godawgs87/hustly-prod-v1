import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  query: string;
  condition: string;
}

interface EbayItem {
  title: string;
  price: number;
  condition: string;
  listingType: string;
  endTime?: string;
}

interface PricingData {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  marketTrend: 'up' | 'down' | 'stable';
  competitors: Array<{
    source: string;
    price: number;
    condition: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, condition }: PricingRequest = await req.json();
    
    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Pricing research request: ${query} (${condition})`);

    // Get eBay pricing data
    const ebayData = await getEbayPricing(query, condition);
    
    // Analyze the data and generate pricing recommendations
    const pricingData = analyzePricingData(ebayData, condition);

    return new Response(
      JSON.stringify(pricingData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pricing-research function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pricing data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getEbayPricing(query: string, condition: string): Promise<EbayItem[]> {
  const clientId = Deno.env.get('EBAY_CLIENT_ID');
  const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('eBay credentials not configured');
  }

  // Get OAuth token
  const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: 'grant_type=client_credentials&scope=https://api.ebayapis.com/oauth/api_scope'
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get eBay OAuth token');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Search for completed listings
  const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&filter=conditionIds:{${getConditionId(condition)}},buyingOptions:{AUCTION|FIXED_PRICE},deliveryCountry:US&sort=price&limit=50`;

  const searchResponse = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  });

  if (!searchResponse.ok) {
    console.error('eBay search failed:', await searchResponse.text());
    return [];
  }

  const searchData = await searchResponse.json();
  
  if (!searchData.itemSummaries) {
    return [];
  }

  return searchData.itemSummaries.map((item: any) => ({
    title: item.title,
    price: parseFloat(item.price?.value || '0'),
    condition: item.condition || condition,
    listingType: item.buyingOptions?.[0] || 'FIXED_PRICE'
  })).filter((item: EbayItem) => item.price > 0);
}

function getConditionId(condition: string): string {
  const conditionMap: { [key: string]: string } = {
    'new': '1000',
    'like new': '1500',
    'excellent': '2000', 
    'very good': '2500',
    'good': '3000',
    'fair': '4000',
    'poor': '5000',
    'used': '3000'
  };
  
  return conditionMap[condition.toLowerCase()] || '3000';
}

function analyzePricingData(items: EbayItem[], condition: string): PricingData {
  if (!items.length) {
    return {
      suggestedPrice: 0,
      priceRange: { min: 0, max: 0 },
      marketTrend: 'stable',
      competitors: [],
      confidence: 'low'
    };
  }

  // Filter and sort prices
  const prices = items.map(item => item.price).sort((a, b) => a - b);
  const validPrices = prices.filter(p => p > 0);

  if (!validPrices.length) {
    return {
      suggestedPrice: 0,
      priceRange: { min: 0, max: 0 },
      marketTrend: 'stable',
      competitors: [],
      confidence: 'low'
    };
  }

  // Calculate statistics
  const min = validPrices[0];
  const max = validPrices[validPrices.length - 1];
  const median = validPrices[Math.floor(validPrices.length / 2)];
  const average = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;

  // Suggested price is weighted average favoring median
  const suggestedPrice = Math.round((median * 0.6 + average * 0.4) * 100) / 100;

  // Sample competitors from different price points
  const competitors = items
    .slice(0, 8) // Take first 8 items
    .map(item => ({
      source: 'eBay',
      price: item.price,
      condition: item.condition
    }));

  // Determine confidence based on data quality
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (items.length >= 10) confidence = 'high';
  else if (items.length >= 5) confidence = 'medium';

  // Simple trend analysis (placeholder - could be enhanced with historical data)
  const marketTrend: 'up' | 'down' | 'stable' = 'stable';

  return {
    suggestedPrice,
    priceRange: { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 },
    marketTrend,
    competitors,
    confidence
  };
}