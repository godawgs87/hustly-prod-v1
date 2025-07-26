import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzePhotosWithOpenAI } from './utils/openaiClient.ts';

// DEBUG: Print the value of the OpenAI API key in the deployed environment
// Force redeploy: 2025-07-19 20:23
console.log('CLOUD ENV DEBUG - OPENAI_API_KEY:', Deno.env.get('OPENAI_API_KEY'));


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('OPENAI_API_KEY:', Deno.env.get('OPENAI_API_KEY'));

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

    // Validate inputs
    if (!photos || !Array.isArray(photos)) {
      console.error('Invalid photos array:', typeof photos);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Photos array is required and must be an array' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (photos.length === 0) {
      console.error('Empty photos array');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'At least one photo is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service not configured. Please try again later.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting photo analysis with', photos.length, 'photos');
    
    // Process and validate base64 images
    const base64Images = photos.map((photo: string, index: number) => {
      console.log(`Processing photo ${index + 1}/${photos.length}`);
      
      if (!photo || typeof photo !== 'string') {
        console.error(`Photo ${index + 1} is invalid:`, typeof photo);
        throw new Error(`Photo ${index + 1} is not a valid string`);
      }
      
      // Handle different base64 formats
      let base64Data = photo;
      
      // If it has a data URL prefix, remove it
      if (photo.includes(',')) {
        base64Data = photo.split(',')[1];
        console.log(`Photo ${index + 1}: Removed data URL prefix`);
      }
      
      // Validate base64 format
      if (!base64Data || base64Data.length === 0) {
        console.error(`Photo ${index + 1} has no base64 data after processing`);
        throw new Error(`Photo ${index + 1} contains no valid base64 data`);
      }
      
      // Basic base64 validation
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        console.error(`Photo ${index + 1} has invalid base64 format`);
        throw new Error(`Photo ${index + 1} is not valid base64`);
      }
      
      console.log(`Photo ${index + 1}: Valid base64, length: ${base64Data.length}`);
      return base64Data;
    });

    console.log('All photos processed successfully, calling OpenAI API...');

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
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);
    
    // Determine error type and provide appropriate response
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (error?.message?.includes('OpenAI API error')) {
      errorMessage = error.message;
      statusCode = 500;
    } else if (error?.message?.includes('not a valid string')) {
      errorMessage = 'Invalid photo format. Please ensure photos are properly uploaded.';
      statusCode = 400;
    } else if (error?.message?.includes('not valid base64')) {
      errorMessage = 'Invalid photo data. Please try re-uploading your photos.';
      statusCode = 400;
    } else if (error?.message?.includes('API key')) {
      errorMessage = 'AI service configuration error. Please try again later.';
      statusCode = 500;
    } else {
      errorMessage = error?.message || 'Analysis service temporarily unavailable';
    }
    
    // Return structured error response
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      debug: {
        type: error?.constructor?.name,
        message: error?.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
