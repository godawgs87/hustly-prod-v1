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
      console.log('Extracted JSON string:', jsonString);
      
      const listingData = JSON.parse(jsonString);
      
      // Validate that we have essential fields
      if (listingData.title && listingData.description) {
        console.log('✅ Successfully parsed JSON with valid data');
        return processValidListing(listingData);
      }
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, checking for content filtering...');
    }
  }

  // More robust content filtering detection - only trigger fallback for clear refusals
  const hasContentFiltering = (
    content.includes("I'm sorry, I can't assist") ||
    content.includes("I cannot analyze") ||
    content.includes("I'm not able to") ||
    (content.includes("I'm unable to") && !content.includes('```json') && !content.includes('{'))
  );
  
  const isTooShort = content.length < 30;
  
  if (hasContentFiltering || isTooShort) {
    console.log('🚨 OpenAI content filtering detected, using fallback');
    console.log('Reason:', hasContentFiltering ? 'Content filtering' : 'Response too short');
    console.log('Content length:', content.length);
    return createFallbackListing();
  }

  // Clean and parse JSON
  try {
    // Remove any markdown formatting or extra text
    let cleanContent = content;
    
    // Remove markdown code blocks if present
    cleanContent = cleanContent.replace(/```json\s*/, '');
    cleanContent = cleanContent.replace(/```\s*$/, '');
    
    // Find JSON object boundaries with multiple attempts
    let jsonStart = cleanContent.indexOf('{');
    let jsonEnd = cleanContent.lastIndexOf('}');
    
    // If no JSON found, try looking for it in different ways
    if (jsonStart === -1 || jsonEnd === -1) {
      // Try looking for JSON after common prefixes
      const jsonPrefixes = ['```json', 'json', 'JSON:', '{'];
      for (const prefix of jsonPrefixes) {
        const prefixIndex = cleanContent.indexOf(prefix);
        if (prefixIndex !== -1) {
          const searchStart = prefixIndex + prefix.length;
          const newJsonStart = cleanContent.indexOf('{', searchStart);
          if (newJsonStart !== -1) {
            jsonStart = newJsonStart;
            jsonEnd = cleanContent.lastIndexOf('}');
            break;
          }
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
