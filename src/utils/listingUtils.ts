
// Utility functions for extracting measurements from listing data

export const getWeightFromListing = (listingData: any): number => {
  if (listingData?.measurements?.weight) {
    const weightStr = listingData.measurements.weight.toLowerCase();
    
    // Handle "N/A" or other non-numeric values
    if (weightStr === 'n/a' || weightStr === 'unknown' || weightStr === '') {
      // For identified products, provide better defaults based on category
      const category = listingData?.category?.toLowerCase() || '';
      if (category.includes('pool')) {
        return 12.0; // Typical pool cleaner weight
      } else if (category.includes('tool')) {
        return 3.0; // Typical tool weight
      } else if (category.includes('electronic')) {
        return 2.0; // Typical electronics weight
      }
      return 3.0; // More reasonable general default
    }
    
    const weightMatch = weightStr.match(/[\d.]+/);
    
    if (weightMatch) {
      const numericWeight = parseFloat(weightMatch[0]);
      
      // Check if it's in ounces and convert to pounds
      if (weightStr.includes('oz')) {
        return numericWeight / 16; // Convert ounces to pounds
      } else if (weightStr.includes('lb') || weightStr.includes('pound')) {
        return numericWeight;
      } else {
        // Default assume pounds if no unit specified
        return numericWeight;
      }
    }
  }
  
  // Fallback: try to determine reasonable weight based on product identification
  const title = listingData?.title?.toLowerCase() || '';
  const brand = listingData?.brand?.toLowerCase() || '';
  const model = listingData?.model?.toLowerCase() || '';
  
  // Specific product knowledge
  if (brand.includes('gosvor') && model.includes('pivot')) {
    return 11.68; // Known weight for Gosvor Pivot
  } else if (title.includes('pool') || title.includes('cleaner')) {
    return 12.0; // Typical pool cleaner
  } else if (title.includes('tool')) {
    return 3.0; // Typical tool
  }
  
  return 3.0; // Final fallback
};

export const getDimensionsFromListing = (listingData: any) => {
  const measurements = listingData?.measurements || {};
  
  const extractNumber = (str: string): number => {
    if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'unknown') {
      return 0;
    }
    const match = str?.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };
  
  let length = extractNumber(measurements.length) || 0;
  let width = extractNumber(measurements.width) || 0;
  let height = extractNumber(measurements.height) || 0;
  
  // Provide better defaults based on product identification
  if (length === 0 || width === 0 || height === 0) {
    const title = listingData?.title?.toLowerCase() || '';
    const brand = listingData?.brand?.toLowerCase() || '';
    const model = listingData?.model?.toLowerCase() || '';
    
    if (brand.includes('gosvor') && model.includes('pivot')) {
      // Known dimensions for Gosvor Pivot: 13 x 11 x 12 inches
      return {
        length: length || 13,
        width: width || 11,
        height: height || 12
      };
    } else if (title.includes('pool') || title.includes('cleaner')) {
      return {
        length: length || 14,
        width: width || 12,
        height: height || 10
      };
    }
  }
  
  return {
    length: length || 10,
    width: width || 6,
    height: height || 4
  };
};

// Legacy functions for backward compatibility (can be removed if not used elsewhere)
export const getWeight = (): number => {
  return 3.0;
};

export const getDimensions = () => {
  return {
    length: 10,
    width: 6, 
    height: 4
  };
};

// Helper function to get measurement strings from listing data
export const getMeasurementStrings = (listingData?: any) => {
  if (listingData?.measurements) {
    return listingData.measurements;
  }
  
  // Fallback to default measurements
  const dims = getDimensions();
  return {
    length: `${dims.length} inches`,
    width: `${dims.width} inches`, 
    height: `${dims.height} inches`,
    weight: `${getWeight()} lbs`
  };
};
