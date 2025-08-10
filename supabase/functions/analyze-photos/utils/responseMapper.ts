/**
 * Maps the new comprehensive AI response format to the existing frontend format
 * This ensures backward compatibility while we upgrade the frontend components
 */
export function mapAIResponseToLegacyFormat(newResponse: any): any {
  try {
    // If it's already in the old format, return as-is
    if (!newResponse.detected_category && newResponse.category) {
      return newResponse;
    }

    // Map new format to old format
    const legacyResponse = {
      title: newResponse.title || '',
      description: newResponse.description || '',
      category: newResponse.marketplace_category || { primary: '', subcategory: '' },
      condition: mapConditionToLegacy(newResponse.condition),
      brand: newResponse.primary_attributes?.brand || newResponse.brand || 'Unbranded',
      color: newResponse.primary_attributes?.color || newResponse.color || null,
      material: newResponse.primary_attributes?.material || newResponse.material || null,
      size: newResponse.primary_attributes?.size || newResponse.size || null,
      
      // Map measurements - handle both naming conventions
      measurements: {
        length_in: newResponse.measurements?.length_inches || newResponse.measurements?.length_in || null,
        width_in: newResponse.measurements?.width_inches || newResponse.measurements?.width_in || null,
        height_in: newResponse.measurements?.height_inches || newResponse.measurements?.height_in || null,
        weight_lb: newResponse.measurements?.weight_lbs || newResponse.measurements?.weight_lb || null,
        // Include clothing measurements if present
        chest_in: newResponse.measurements?.other_measurements?.chest || null,
        sleeve_in: newResponse.measurements?.other_measurements?.sleeve || null,
        shoulder_in: newResponse.measurements?.other_measurements?.shoulder || null,
        waist_in: newResponse.measurements?.other_measurements?.waist || null,
        diameter_in: newResponse.measurements?.other_measurements?.diameter || null,
      },
      
      // Map identifiers
      identifiers: newResponse.identifiers || {
        model_number: null,
        part_number: null,
        serial_number: null,
        upc_ean: null
      },
      
      // Map compatibility (for automotive items)
      compatibility: extractCompatibility(newResponse),
      
      // Keywords remain the same
      keywords: newResponse.keywords || [],
      
      // Map shipping weight
      shipping_weight_lb: newResponse.shipping_weight_lbs || newResponse.shipping_weight_lb || null,
      
      // Map flaws
      flaws: Array.isArray(newResponse.flaws) ? newResponse.flaws : ['none visible'],
      
      // Map confidence score
      confidence_score: newResponse.confidence_score || 85,
      
      // Map detected text and evidence
      detected_text: newResponse.detected_text || [],
      evidence: newResponse.evidence || [],
      assumptions: newResponse.assumptions || [],
      
      // Add price if it exists (from price research)
      price: newResponse.price || null,
      priceResearch: newResponse.priceResearch || null,
      
      // Include new valuable fields as metadata
      metadata: {
        detected_category: newResponse.detected_category,
        condition_details: newResponse.condition_details,
        value_indicators: newResponse.value_indicators,
        listing_optimization: newResponse.listing_optimization,
        category_specific: newResponse.category_specific
      }
    };

    return legacyResponse;
  } catch (error) {
    console.error('Error mapping AI response:', error);
    // Return the original response if mapping fails
    return newResponse;
  }
}

/**
 * Maps new condition values to legacy format
 */
function mapConditionToLegacy(condition: string): string {
  const conditionMap: { [key: string]: string } = {
    'Mint': 'Excellent',
    'Near Mint': 'Excellent',
    'Excellent': 'Excellent',
    'Very Good': 'Good',
    'Good': 'Good',
    'Fair': 'Fair',
    'Poor': 'Poor'
  };
  
  return conditionMap[condition] || condition || 'Good';
}

/**
 * Extracts compatibility information from category_specific fields
 */
function extractCompatibility(response: any): any {
  // Check if it's an automotive item
  if (response.detected_category?.toLowerCase().includes('automotive') || 
      response.category_specific?.part_type) {
    
    // Try to extract from category_specific
    if (response.category_specific?.make_model) {
      const makeModel = response.category_specific.make_model;
      const parts = makeModel.split(' ');
      return {
        make: parts[0] || null,
        model: parts.slice(1).join(' ') || null,
        years: response.category_specific.fitment_years || null
      };
    }
    
    // Fall back to compatibility field if it exists
    return response.compatibility || {
      make: null,
      model: null,
      years: null
    };
  }
  
  // Return existing compatibility or empty object for non-automotive items
  return response.compatibility || {
    make: null,
    model: null,
    years: null
  };
}

/**
 * Validates that required fields are present
 */
export function validateAIResponse(response: any): boolean {
  const requiredFields = ['title', 'description'];
  
  for (const field of requiredFields) {
    if (!response[field] || response[field].trim() === '') {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate title length
  if (response.title && response.title.length > 80) {
    console.warn(`Title exceeds 80 characters: ${response.title.length}`);
  }
  
  return true;
}
