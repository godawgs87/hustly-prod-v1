

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzePhotosWithOpenAI } from './utils/openaiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ANALYZE PHOTOS FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      // Parse JSON body directly
      requestBody = await req.json();
      console.log('Successfully parsed JSON directly');
      console.log('Request body type:', typeof requestBody);
      console.log('Photos array length:', requestBody?.photos?.length || 0);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body. Please try again.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { photos } = requestBody;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('=== DEBUG INFO ===');
    console.log('OpenAI API Key exists:', !!openAIApiKey);
    console.log('Photos received:', photos?.length || 0);
    
    if (photos && photos.length > 0) {
      console.log('First photo preview (first 100 chars):', photos[0]?.substring(0, 100));
    }

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No photos provided for analysis' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in edge function secrets.' 
      }), {
        status: 200, // Return 200 so frontend gets the error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert first photo to base64 for analysis
    const base64Images = photos.map((photo: string) => {
      return photo.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    });

    console.log('Preparing to call OpenAI API...');

    const listingData = await analyzePhotosWithOpenAI(openAIApiKey, base64Images);

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      listing: listingData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN ANALYZE-PHOTOS FUNCTION ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Full error:', error);
    
    // Return structured error response
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
