import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  fullPath: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required for category suggestions' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID');
    const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET');

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      throw new Error('eBay credentials not configured');
    }

    // Get eBay OAuth token
    const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`)}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get eBay OAuth token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Modern eBay API approach - using mock suggestions for now
    // TODO: Implement eBay Browse API for category suggestions
    
    // Provide mock suggestions based on keywords
    const mockSuggestions: CategorySuggestion[] = [];
    
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('shoe') || lowerTitle.includes('sneaker') || lowerTitle.includes('boot')) {
      if (lowerTitle.includes('men') || lowerTitle.includes('male')) {
        mockSuggestions.push({
          categoryId: '57989',
          categoryName: 'Athletic Shoes',
          confidence: 0.9,
          fullPath: 'Clothing, Shoes & Accessories > Men > Athletic Shoes'
        });
      } else if (lowerTitle.includes('women') || lowerTitle.includes('female')) {
        mockSuggestions.push({
          categoryId: '95672',
          categoryName: 'Athletic Shoes',
          confidence: 0.9,
          fullPath: 'Clothing, Shoes & Accessories > Women > Athletic Shoes'
        });
      }
    }
    
    if (lowerTitle.includes('shirt') || lowerTitle.includes('tee') || lowerTitle.includes('top')) {
      if (lowerTitle.includes('men') || lowerTitle.includes('male')) {
        mockSuggestions.push({
          categoryId: '15687',
          categoryName: 'T-Shirts',
          confidence: 0.85,
          fullPath: 'Clothing, Shoes & Accessories > Men > T-Shirts'
        });
      }
    }

    // Fallback to general clothing category
    if (mockSuggestions.length === 0) {
      mockSuggestions.push({
        categoryId: '11450',
        categoryName: 'Clothing, Shoes & Accessories',
        confidence: 0.6,
        fullPath: 'Clothing, Shoes & Accessories'
      });
    }

    console.log(`Generated ${mockSuggestions.length} category suggestions for: "${title}"`);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions: mockSuggestions,
        query: title
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Category suggestions error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Category suggestions failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});