
// AI simulation utilities for bulk upload
// TODO: Replace with actual AI photo analysis service

export const generateRealisticListingData = (groupName: string, photoCount: number) => {
  // IMPORTANT: This should analyze actual photos, not generate random data
  // For now, creating better placeholder data that users can customize
  
  console.log('Generating listing data for group:', groupName, 'with', photoCount, 'photos');
  
  // Use the actual group name as the title (this comes from photo grouping)
  const title = groupName && groupName !== 'Group 1' ? groupName : generateSmartTitle(photoCount);
  
  // Generate smarter default data based on common item types
  const itemType = detectItemType(title);
  
  return {
    title: title,
    description: generateSmartDescription(title, itemType),
    price: generateSmartPrice(itemType),
    category: itemType.category,
    category_id: null,
    condition: 'Good', // User should verify condition
    measurements: generateSmartMeasurements(itemType),
    keywords: generateSmartKeywords(title, itemType),
    photos: [], // Will be populated with actual photo URLs
    priceResearch: `Based on similar ${itemType.type} items. Please research current market prices.`,
    purchase_price: undefined,
    purchase_date: undefined,
    source_location: undefined,
    source_type: undefined,
    is_consignment: false,
    consignment_percentage: undefined,
    consignor_name: undefined,
    consignor_contact: undefined,
    clothing_size: itemType.type === 'clothing' ? 'M' : undefined,
    shoe_size: itemType.type === 'shoes' ? '9' : undefined,
    gender: (itemType.type === 'clothing' || itemType.type === 'shoes') ? 'Unisex' as const : undefined,
    age_group: 'Adult' as const,
    features: [],
    includes: [],
    defects: []
  };
};

function generateSmartTitle(photoCount: number): string {
  const commonItems = [
    'Vintage Leather Jacket',
    'Designer Handbag', 
    'Athletic Sneakers',
    'Electronic Device',
    'Home Decor Item',
    'Kitchen Appliance',
    'Book Collection',
    'Collectible Item'
  ];
  
  return commonItems[Math.floor(Math.random() * commonItems.length)];
}

function detectItemType(title: string) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('shoe') || titleLower.includes('sneaker') || titleLower.includes('boot')) {
    return { type: 'shoes', category: 'Shoes' };
  }
  
  if (titleLower.includes('jacket') || titleLower.includes('shirt') || titleLower.includes('dress') || titleLower.includes('clothing')) {
    return { type: 'clothing', category: 'Clothing' };
  }
  
  if (titleLower.includes('bag') || titleLower.includes('purse') || titleLower.includes('handbag')) {
    return { type: 'accessory', category: 'Accessories' };
  }
  
  if (titleLower.includes('electronic') || titleLower.includes('phone') || titleLower.includes('computer')) {
    return { type: 'electronics', category: 'Electronics' };
  }
  
  if (titleLower.includes('book') || titleLower.includes('novel')) {
    return { type: 'books', category: 'Books' };
  }
  
  return { type: 'general', category: 'Miscellaneous' };
}

function generateSmartDescription(title: string, itemType: any): string {
  const baseDesc = `${title} in good condition.`;
  
  switch (itemType.type) {
    case 'clothing':
      return `${baseDesc} Please verify size and condition details. Check for any wear, stains, or damage before listing.`;
    case 'shoes':
      return `${baseDesc} Please check sole wear, interior condition, and verify size before listing.`;
    case 'electronics':
      return `${baseDesc} Please test functionality and include any accessories or original packaging.`;
    case 'books':
      return `${baseDesc} Please check for highlighting, writing, or damage to pages and cover.`;
    default:
      return `${baseDesc} Please add detailed description including condition, features, and any included items.`;
  }
}

function generateSmartPrice(itemType: any): number {
  switch (itemType.type) {
    case 'shoes':
      return 45;
    case 'clothing':
      return 25;
    case 'electronics':
      return 75;
    case 'books':
      return 12;
    case 'accessory':
      return 35;
    default:
      return 25;
  }
}

function generateSmartMeasurements(itemType: any) {
  switch (itemType.type) {
    case 'shoes':
      return { length: "12", width: "4", height: "5", weight: "2.0" };
    case 'clothing':
      return { length: "24", width: "18", height: "2", weight: "0.8" };
    case 'books':
      return { length: "9", width: "6", height: "1", weight: "0.5" };
    default:
      return { length: "12", width: "8", height: "4", weight: "1.0" };
  }
}

function generateSmartKeywords(title: string, itemType: any): string[] {
  const baseKeywords = title.toLowerCase().split(' ').filter(word => word.length > 2);
  
  const typeKeywords = {
    'shoes': ['footwear', 'athletic', 'comfortable'],
    'clothing': ['fashion', 'style', 'apparel'],
    'electronics': ['tech', 'gadget', 'device'],
    'books': ['literature', 'reading', 'education'],
    'accessory': ['fashion', 'style', 'accessory']
  };
  
  return [...baseKeywords, ...(typeKeywords[itemType.type] || ['item', 'quality'])];
}
