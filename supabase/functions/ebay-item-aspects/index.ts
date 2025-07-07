import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemAspect {
  name: string;
  required: boolean;
  valueType: 'TEXT' | 'SELECTION' | 'NUMERIC';
  possibleValues?: string[];
  unit?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId } = await req.json();

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: 'Category ID is required' }),
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

    // First check if we have cached data for this category
    const { data: cachedCategory } = await supabaseClient
      .from('ebay_categories')
      .select('requires_item_specifics, suggested_item_specifics')
      .eq('ebay_category_id', categoryId)
      .single();

    if (cachedCategory) {
      const aspects: ItemAspect[] = [
        ...cachedCategory.requires_item_specifics.map((name: string) => ({
          name,
          required: true,
          valueType: 'TEXT' as const
        })),
        ...cachedCategory.suggested_item_specifics.map((name: string) => ({
          name,
          required: false,
          valueType: 'TEXT' as const
        }))
      ];

      return new Response(
        JSON.stringify({ 
          success: true,
          categoryId,
          aspects,
          source: 'cached'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // If not cached, provide mock data based on category
    const mockAspects: ItemAspect[] = [];

    // Athletic Shoes specifics
    if (categoryId === '57989' || categoryId === '95672') {
      mockAspects.push(
        { name: 'Brand', required: true, valueType: 'SELECTION', possibleValues: ['Nike', 'Adidas', 'New Balance', 'ASICS', 'Other'] },
        { name: 'US Shoe Size (Men\'s)', required: true, valueType: 'SELECTION', possibleValues: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'] },
        { name: 'Color', required: true, valueType: 'TEXT' },
        { name: 'Material', required: false, valueType: 'SELECTION', possibleValues: ['Leather', 'Synthetic', 'Mesh', 'Canvas'] },
        { name: 'Style', required: false, valueType: 'TEXT' },
        { name: 'Features', required: false, valueType: 'TEXT' }
      );
    }
    // T-Shirts specifics
    else if (categoryId === '15687') {
      mockAspects.push(
        { name: 'Brand', required: true, valueType: 'TEXT' },
        { name: 'Size (Men\'s)', required: true, valueType: 'SELECTION', possibleValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Color', required: true, valueType: 'TEXT' },
        { name: 'Material', required: false, valueType: 'SELECTION', possibleValues: ['Cotton', 'Polyester', 'Cotton Blend'] },
        { name: 'Sleeve Length', required: false, valueType: 'SELECTION', possibleValues: ['Short Sleeve', 'Long Sleeve', 'Sleeveless'] }
      );
    }
    // General clothing
    else {
      mockAspects.push(
        { name: 'Brand', required: false, valueType: 'TEXT' },
        { name: 'Size', required: false, valueType: 'TEXT' },
        { name: 'Color', required: false, valueType: 'TEXT' },
        { name: 'Condition', required: true, valueType: 'SELECTION', possibleValues: ['New with tags', 'New without tags', 'Pre-owned'] }
      );
    }

    console.log(`Generated ${mockAspects.length} item aspects for category: ${categoryId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        categoryId,
        aspects: mockAspects,
        source: 'generated'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Item aspects error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Item aspects fetch failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});