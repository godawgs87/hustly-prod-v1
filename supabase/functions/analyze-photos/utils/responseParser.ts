import { mapAIResponseToLegacyFormat, validateAIResponse } from './responseMapper.ts';

export function parseOpenAIResponse(content: string) {
  console.log('=== OPENAI RESPONSE PARSING START ===');
  console.log('Raw OpenAI content:', content);
  console.log('Content length:', content.length);
  console.log('Content type:', typeof content);
  console.log('First 200 chars:', content.substring(0, 200));
  console.log('Last 200 chars:', content.substring(Math.max(0, content.length - 200)));

  // First, try to find JSON content even if there's disclaimer text
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  
  // If we found JSON boundaries, try to parse that first
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    console.log('🔍 Found JSON boundaries, attempting to parse...');
    try {
      const jsonString = content.substring(jsonStart, jsonEnd + 1);
      
      // Try to parse as JSON
      const parsedData = JSON.parse(jsonString);
      console.log('✅ Successfully parsed JSON');
      console.log('Parsed listing data:', JSON.stringify(parsedData, null, 2));
      
      // Map new format to legacy format if needed
      const listingData = mapAIResponseToLegacyFormat(parsedData);
      
      // Validate essential fields
      if (!validateAIResponse(listingData)) {
        console.log('⚠️ Missing essential fields, using fallback');
        return createFallbackListing();
      }
      
      return processValidListing(listingData);
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, checking for content filtering...');
    }
  }

  // Even more robust content filtering detection - be very conservative about fallbacks
  const clearRefusalPhrases = [
    "I'm sorry, I can't assist",
    "I cannot analyze",
    "I'm not able to analyze",
    "I cannot provide",
    "I'm unable to provide",
    "I can't help with"
  ];
  
  const hasContentFiltering = clearRefusalPhrases.some(phrase => content.includes(phrase));
  
  // Only consider it too short if it's extremely short AND has no JSON-like content
  const isTooShort = content.length < 20 && !content.includes('{') && !content.includes('"');
  
  if (hasContentFiltering || isTooShort) {
    console.log('🚨 OpenAI content filtering detected, using fallback');
    console.log('Reason:', hasContentFiltering ? 'Content filtering' : 'Response too short');
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 100));
    return createFallbackListing();
  }

  // Clean and parse JSON
  try {
    // Remove any markdown formatting or extra text
    let cleanContent = content;
    
    // Remove markdown code blocks if present
    cleanContent = cleanContent.replace(/```json\s*/, '');
    cleanContent = cleanContent.replace(/```\s*$/, '');
    
    // Enhanced JSON boundary detection with multiple strategies
    let jsonStart = cleanContent.indexOf('{');
    let jsonEnd = cleanContent.lastIndexOf('}');
    
    // Strategy 1: Look for JSON after common prefixes
    if (jsonStart === -1 || jsonEnd === -1) {
      const jsonPrefixes = ['```json', 'json', 'JSON:', 'Here is the', 'Here\'s the', '{'];
      for (const prefix of jsonPrefixes) {
        const prefixIndex = cleanContent.indexOf(prefix);
        if (prefixIndex !== -1) {
          const searchStart = prefixIndex + prefix.length;
          const newJsonStart = cleanContent.indexOf('{', searchStart);
          if (newJsonStart !== -1) {
            jsonStart = newJsonStart;
            // Find matching closing brace
            let braceCount = 0;
            let endIndex = jsonStart;
            for (let i = jsonStart; i < cleanContent.length; i++) {
              if (cleanContent[i] === '{') braceCount++;
              if (cleanContent[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i;
                  break;
                }
              }
            }
            if (jsonEnd > jsonStart) break;
          }
        }
      }
    }
    
    // Strategy 2: If still no valid JSON, try to extract any object-like structure
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      // Look for any quoted strings that might indicate JSON-like content
      const hasQuotedContent = /"\w+"\s*:/.test(cleanContent);
      if (hasQuotedContent) {
        console.log('Found quoted content, attempting to extract partial JSON');
        // Try to find the first and last meaningful braces
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStart = firstBrace;
          jsonEnd = lastBrace;
        }
      }
    }
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.log('No valid JSON boundaries found in response, using fallback');
      console.log('jsonStart:', jsonStart, 'jsonEnd:', jsonEnd);
      return createFallbackListing();
    }
    
    const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
    console.log('Extracted JSON string length:', jsonString.length);
    console.log('JSON preview:', jsonString.substring(0, 200) + '...');
    
    const listingData = JSON.parse(jsonString);
    
    // More flexible validation - accept if we have either title or some meaningful content
    if (!listingData.title && !listingData.description && !listingData.brand) {
      console.log('No meaningful content found in parsed JSON, using fallback');
      console.log('Parsed keys:', Object.keys(listingData));
      return createFallbackListing();
    }
    
    // If missing title but have other data, try to construct a basic title
    if (!listingData.title && (listingData.brand || listingData.description)) {
      console.log('Missing title, attempting to construct from available data');
      listingData.title = listingData.brand || 'Product Listing';
    }
    
    // If missing description, provide a basic one
    if (!listingData.description) {
      console.log('Missing description, providing basic description');
      listingData.description = 'Product description not available. Please review and add details.';
    }
    
    // Ensure price is a number
    if (typeof listingData.price === 'string') {
      listingData.price = parseFloat(listingData.price.replace(/[^0-9.]/g, '')) || 25.00;
    } else if (typeof listingData.price !== 'number' || listingData.price <= 0) {
      listingData.price = 25.00;
    }
    
    // Map condition values from AI to UI-expected values
    if (listingData.condition) {
      const conditionMapping: { [key: string]: string } = {
        'Excellent': 'Like New',
        'Very Good': 'Like New', 
        'Good': 'Used',
        'Fair': 'Fair',
        'Poor': 'Poor',
        'New': 'New',
        'Like New': 'Like New',
        'Used': 'Used'
      };
      listingData.condition = conditionMapping[listingData.condition] || listingData.condition;
    }
    
    // Ensure arrays exist
    listingData.keywords = listingData.keywords || [];
    listingData.features = listingData.features || [];
    listingData.defects = listingData.defects || [];
    listingData.includes = listingData.includes || [];
    
    // Handle size information
    if (listingData.gender && ['Men', 'Women', 'Kids', 'Unisex'].includes(listingData.gender)) {
      // Keep the gender as is
    } else {
      delete listingData.gender;
    }
    
    if (listingData.age_group && ['Youth', 'Toddler', 'Baby'].includes(listingData.age_group)) {
      // Keep the age_group as is
    } else {
      delete listingData.age_group;
    }
    
    // Clean up size fields if they contain placeholder text
    if (listingData.clothing_size && listingData.clothing_size.toLowerCase().includes('not visible')) {
      delete listingData.clothing_size;
    }
    
    if (listingData.shoe_size && listingData.shoe_size.toLowerCase().includes('not visible')) {
      delete listingData.shoe_size;
    }
    
    console.log('Successfully parsed enhanced listing data with size information');
    return listingData;

  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    console.error('Failed content:', content);
    console.log('Using fallback due to JSON parsing error');
    return createFallbackListing();
  }
}

function createFallbackListing() {
  return {
    title: "Needs Review - Listing Not Fully Generated",
    description: "AI listing generation failed. Please review and complete all required fields.",
    price: 25.00,
    condition: "N/A",
    category: {
      primary: "Uncategorized",
      subcategory: null
    },
    pricing: {
      suggested_price: null,
      price_reasoning: null,
      markup_percentage: null,
      price_range: {
        minimum: null,
        maximum: null
      }
    },
    measurements: {
      chest: null,
      length: null,
      sleeve: null
    },
    shipping: {
      weight_oz: null,
      recommended_service: null,
      estimated_cost: null
    },
    platform_optimization: {
      ebay: {
        category_id: null,
        item_specifics: {}
      },
      poshmark: {
        size_category: null,
        hashtags: []
      },
      mercari: {
        condition: null,
        shipping_weight: null
      },
      depop: {
        tags: [],
        trending_hashtags: []
      }
    },
    seo_keywords: [],
    cross_sell_suggestions: [],
    seasonal_timing: {
      best_months: [],
      urgency_factor: null
    },
    authenticity_confidence: null,
    comparable_sales: [],
    confidence_score: 0,
    suggestions: ["AI listing generation failed. Please complete all required fields manually."],
    needs_review: true
  };
}

function processValidListing(listingData) {
  // Ensure price is a number
  if (typeof listingData.price === 'string') {
    listingData.price = parseFloat(listingData.price.replace(/[^0-9.]/g, '')) || 25.00;
  } else if (typeof listingData.price !== 'number' || listingData.price <= 0) {
    listingData.price = 25.00;
  }
  
  // Map condition values from AI to UI-expected values
  if (listingData.condition) {
    const conditionMapping: { [key: string]: string } = {
      'Excellent': 'Like New',
      'Very Good': 'Like New', 
      'Good': 'Used',
      'Fair': 'Fair',
      'Poor': 'Poor',
      'New': 'New',
      'Like New': 'Like New',
      'Used': 'Used'
    };
    listingData.condition = conditionMapping[listingData.condition] || listingData.condition;
  }
  
  // Ensure arrays exist
  listingData.keywords = listingData.keywords || [];
  listingData.features = listingData.features || [];
  listingData.defects = listingData.defects || [];
  listingData.includes = listingData.includes || [];
  
  // Handle size information
  if (listingData.gender && ['Men', 'Women', 'Kids', 'Unisex'].includes(listingData.gender)) {
    // Keep the gender as is
  } else {
    delete listingData.gender;
  }
  
  if (listingData.age_group && ['Youth', 'Toddler', 'Baby'].includes(listingData.age_group)) {
    // Keep the age_group as is
  } else {
    delete listingData.age_group;
  }
  
  // Clean up size fields if they contain placeholder text
  if (listingData.clothing_size && listingData.clothing_size.toLowerCase().includes('not visible')) {
    delete listingData.clothing_size;
  }
  
  if (listingData.shoe_size && listingData.shoe_size.toLowerCase().includes('not visible')) {
    delete listingData.shoe_size;
  }
  
  console.log('Successfully parsed enhanced listing data with size information');
  return listingData;
}
