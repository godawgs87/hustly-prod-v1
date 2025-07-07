export function parseOpenAIResponse(content: string) {
  console.log('Raw OpenAI content:', content);

  // Clean and parse JSON
  try {
    // Remove any markdown formatting or extra text
    let cleanContent = content;
    
    // Remove markdown code blocks if present
    cleanContent = cleanContent.replace(/```json\s*/, '');
    cleanContent = cleanContent.replace(/```\s*$/, '');
    
    // Find JSON object boundaries
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }
    
    const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
    console.log('Extracted JSON string:', jsonString);
    
    const listingData = JSON.parse(jsonString);
    
    // Validate required fields
    if (!listingData.title || !listingData.description) {
      throw new Error('Missing required fields in response');
    }
    
    // Ensure price is a number
    if (typeof listingData.price === 'string') {
      listingData.price = parseFloat(listingData.price.replace(/[^0-9.]/g, '')) || 85;
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
    
    // Return enhanced fallback response
    return {
      title: "Professional Tool - Needs Review",
      description: "Professional grade tool in working condition. Please review photos carefully and update this listing with accurate details based on the specific item shown.",
      price: 85,
      category: "Tools & Hardware",
      condition: "Used",
      measurements: {
        length: "10 inches",
        width: "8 inches",
        height: "6 inches",
        weight: "2 lbs"
      },
      keywords: ["tool", "professional", "equipment"],
      priceResearch: "Estimated based on typical tool pricing - please verify current market value",
      brand: "Unknown",
      model: "Please identify from photos",
      features: ["Professional grade", "Working condition"],
      defects: ["Please inspect photos for wear"],
      includes: ["Item as shown in photos"]
    };
  }
}
