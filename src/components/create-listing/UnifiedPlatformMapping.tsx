import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ListingData } from '@/types/CreateListing';

interface PlatformMapping {
  platform: string;
  platformKey: string;
  icon: string;
  category: string;
  originalPrice: number;
  sellerFees: number;
  priceAfterFees: number;
  platformFields: Record<string, any>;
  isSelected: boolean;
}

interface UnifiedPlatformMappingProps {
  listingData: ListingData;
  basePrice: number;
  selectedPlatforms?: string[];
  onPlatformToggle?: (platform: string, selected: boolean) => void;
}

interface PlatformConfig {
  name: string;
  icon: string;
  feeRate: number;
  color: string;
  extractFields: (data: ListingData) => Record<string, any>;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  ebay: {
    name: 'eBay',
    icon: '🛒',
    feeRate: 0.1295, // 12.95% final value fee
    color: 'bg-blue-100 text-blue-800',
    extractFields: (data: ListingData) => ({
      condition: data.condition,
      brand: data.brand,
      mpn: data.mpn || extractMPN(data.title || ''),
      upc: data.upc || extractUPC(data.description || ''),
      leafCategoryId: data.ebay_category_id || getEbayCategoryId(data),
      categoryPath: data.ebay_category_path || null,
      itemSpecifics: data.item_specifics || {
        Brand: data.brand,
        Condition: data.condition,
        Color: data.color,
        Material: data.material,
        Size: data.size,
        'Manufacturer Part Number': data.mpn || extractMPN(data.title || ''),
        'OE/OEM Part Number': extractOENumber(data.title || ''),
        'Fitment Type': data.fitment_type || 'Direct Replacement'
      }
    })
  },
  mercari: {
    name: 'Mercari',
    icon: '🏪',
    feeRate: 0.1295, // 12.95% selling fee
    color: 'bg-orange-100 text-orange-800',
    extractFields: (data: ListingData) => ({
      condition: mapConditionToMercari(data.condition),
      brand: data.brand,
      size: data.size,
      color: data.color,
      shippingWeight: data.shipping_weight,
      tags: extractTags(data),
      sku: data.sku
    })
  },
  poshmark: {
    name: 'Poshmark',
    icon: '👗',
    feeRate: 0.20, // 20% commission
    color: 'bg-pink-100 text-pink-800',
    extractFields: (data: ListingData) => ({
      brand: data.brand,
      size: data.size,
      color: data.color,
      condition: mapConditionToPoshmark(data.condition),
      category: mapCategoryToPoshmark(data.category),
      originalPrice: data.original_price,
      style: extractStyle(data.description || '')
    })
  },
  depop: {
    name: 'Depop',
    icon: '🎨',
    feeRate: 0.10, // 10% selling fee
    color: 'bg-purple-100 text-purple-800',
    extractFields: (data: ListingData) => ({
      brand: data.brand,
      size: data.size,
      color: data.color,
      condition: data.condition,
      style: extractStyle(data.description || ''),
      era: extractEra(data.description || ''),
      tags: extractTags(data),
      subcategory: data.subcategory
    })
  },
  facebook: {
    name: 'Facebook Marketplace',
    icon: '📘',
    feeRate: 0.05, // 5% selling fee
    color: 'bg-blue-100 text-blue-600',
    extractFields: (data: ListingData) => ({
      condition: data.condition,
      brand: data.brand,
      location: 'Local pickup available',
      category: mapCategoryToFacebook(data.category),
      vehicleInfo: extractVehicleInfo(data),
      availability: 'In Stock'
    })
  },
  whatnot: {
    name: 'Whatnot',
    icon: '🎬',
    feeRate: 0.08, // 8% transaction fee
    color: 'bg-yellow-100 text-yellow-800',
    extractFields: (data: ListingData) => ({
      condition: data.condition,
      brand: data.brand,
      category: mapCategoryToWhatnot(data.category),
      startingBid: Math.floor((data.price || basePrice) * 0.5), // 50% of list price as starting bid
      buyNowPrice: data.price || basePrice,
      authenticityGuarantee: isAuthenticityEligible(data),
      shippingWeight: data.shipping_weight,
      tags: extractTags(data)
    })
  }
};

// Helper functions to extract platform-specific data
function extractMPN(title: string): string | null {
  const mpnMatch = title.match(/\b[A-Z0-9]{3,}-[A-Z0-9]{3,}\b/);
  return mpnMatch ? mpnMatch[0] : null;
}

function extractOENumber(title: string): string | null {
  // Extract OE/OEM part numbers (common in automotive)
  const oeMatch = title.match(/\b[A-Z0-9]{2,}[-]?[A-Z0-9]+[-]?[A-Z0-9]*\b/);
  return oeMatch ? oeMatch[0] : null;
}

function extractUPC(description: string): string | null {
  const upcMatch = description.match(/\b\d{12}\b/);
  return upcMatch ? upcMatch[0] : null;
}

function extractStyle(description: string): string {
  const styles = ['vintage', 'retro', 'modern', 'classic', 'trendy', 'casual', 'formal'];
  const found = styles.find(style => description.toLowerCase().includes(style));
  return found || 'casual';
}

function extractEra(description: string): string {
  const eras = ['90s', '2000s', '2010s', 'vintage', 'retro'];
  const found = eras.find(era => description.toLowerCase().includes(era));
  return found || 'modern';
}

function extractTags(data: ListingData): string[] {
  const tags = [];
  if (data.brand) tags.push(data.brand);
  if (data.category?.primary) tags.push(data.category.primary);
  if (data.keywords) tags.push(...data.keywords.slice(0, 3));
  return tags.slice(0, 5); // Most platforms limit tags
}

function extractVehicleInfo(data: ListingData): string | null {
  // Extract vehicle year/make/model for automotive parts
  const title = data.title || '';
  const vehicleMatch = title.match(/(\d{4}[-\s]?\d{0,4})?\s*([A-Za-z]+)\s+([A-Za-z0-9\-]+)/);
  if (vehicleMatch) {
    return `${vehicleMatch[1] || ''} ${vehicleMatch[2]} ${vehicleMatch[3]}`.trim();
  }
  return null;
}

function getEbayCategoryId(data: ListingData): string {
  // Return the stored category ID or detect based on keywords
  if (data.ebay_category_id) return data.ebay_category_id;
  
  const title = (data.title || '').toLowerCase();
  const description = (data.description || '').toLowerCase();
  const combined = title + ' ' + description;
  
  // Auto-detect common automotive categories
  if (combined.includes('key fob') || combined.includes('smart key') || combined.includes('keyless')) {
    return '33542'; // Keyless Entry Remotes & Fobs
  }
  if (combined.includes('sensor')) {
    return '33694'; // Sensors
  }
  if (combined.includes('tpms')) {
    return '262215'; // TPMS Sensors
  }
  
  return '6030'; // Other Parts (default for automotive)
}

function isAuthenticityEligible(data: ListingData): boolean {
  // Check if item is eligible for authenticity guarantee (luxury brands, high value)
  const luxuryBrands = ['gucci', 'louis vuitton', 'chanel', 'hermes', 'rolex', 'omega'];
  const brand = (data.brand || '').toLowerCase();
  return luxuryBrands.includes(brand) || data.price > 500;
}

function mapConditionToMercari(condition: string): string {
  const mapping: Record<string, string> = {
    'Excellent': 'Like New',
    'Good': 'Good',
    'Fair': 'Fair',
    'Poor': 'Poor'
  };
  return mapping[condition] || condition;
}

function mapConditionToPoshmark(condition: string): string {
  const mapping: Record<string, string> = {
    'Excellent': 'NWT',
    'Good': 'EUC',
    'Fair': 'Good',
    'Poor': 'Fair'
  };
  return mapping[condition] || condition;
}

function mapCategoryToPoshmark(category: any): string {
  if (typeof category === 'object' && category?.primary) {
    const primary = category.primary.toLowerCase();
    if (primary.includes('clothing')) return 'Women';
    if (primary.includes('shoes')) return 'Shoes';
    if (primary.includes('accessories')) return 'Accessories';
    if (primary.includes('automotive')) return 'Other';
  }
  return 'Other';
}

function mapCategoryToFacebook(category: any): string {
  if (typeof category === 'object' && category?.primary) {
    const primary = category.primary;
    if (primary.toLowerCase().includes('automotive')) return 'Automotive';
    return primary;
  }
  return typeof category === 'string' ? category : 'Other';
}

function mapCategoryToWhatnot(category: any): string {
  if (typeof category === 'object' && category?.primary) {
    const primary = category.primary.toLowerCase();
    if (primary.includes('automotive')) return 'Automotive';
    if (primary.includes('collectibles')) return 'Collectibles';
    if (primary.includes('trading cards')) return 'Trading Cards';
    if (primary.includes('toys')) return 'Toys';
    return 'Other';
  }
  return 'Other';
}

const UnifiedPlatformMapping: React.FC<UnifiedPlatformMappingProps> = ({
  listingData,
  basePrice,
  selectedPlatforms = ['ebay', 'mercari', 'poshmark', 'depop', 'facebook', 'whatnot'], // Default all selected
  onPlatformToggle
}) => {
  const [localSelectedPlatforms, setLocalSelectedPlatforms] = useState<string[]>(selectedPlatforms);

  const generatePlatformMappings = (): PlatformMapping[] => {
    return Object.entries(PLATFORM_CONFIGS).map(([key, config]) => {
      const sellerFees = basePrice * config.feeRate;
      const priceAfterFees = basePrice - sellerFees;
      
      return {
        platform: config.name,
        platformKey: key,
        icon: config.icon,
        category: getCategoryForPlatform(key, listingData.category, listingData),
        originalPrice: basePrice,
        sellerFees,
        priceAfterFees,
        platformFields: config.extractFields(listingData),
        isSelected: localSelectedPlatforms.includes(key)
      };
    });
  };

  const getCategoryForPlatform = (platform: string, category: any, listingData: ListingData): string => {
    // Special handling for eBay to show the extracted category
    if (platform === 'ebay' && listingData.ebay_category_id) {
      return `Category: ${listingData.ebay_category_id}`;
    }
    
    // This would integrate with your existing category mapping services
    if (typeof category === 'object' && category?.primary) {
      return category.primary;
    }
    return typeof category === 'string' ? category : 'Automotive';
  };

  const handlePlatformToggle = (platformKey: string, checked: boolean) => {
    const newSelected = checked 
      ? [...localSelectedPlatforms, platformKey]
      : localSelectedPlatforms.filter(p => p !== platformKey);
    
    setLocalSelectedPlatforms(newSelected);
    
    if (onPlatformToggle) {
      onPlatformToggle(platformKey, checked);
    }
  };

  const mappings = generatePlatformMappings();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cross-Platform Mapping</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mappings.map((mapping) => (
          <Card key={mapping.platformKey} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={mapping.isSelected}
                  onCheckedChange={(checked) => handlePlatformToggle(
                    mapping.platformKey, 
                    checked as boolean
                  )}
                />
                <span className="text-xl">{mapping.icon}</span>
                <h4 className="font-semibold">{mapping.platform}</h4>
              </div>
              <Badge className={
                mapping.platform === 'eBay' ? 'bg-blue-100 text-blue-800' :
                mapping.platform === 'Mercari' ? 'bg-orange-100 text-orange-800' :
                mapping.platform === 'Poshmark' ? 'bg-pink-100 text-pink-800' :
                mapping.platform === 'Depop' ? 'bg-purple-100 text-purple-800' :
                mapping.platform === 'Facebook Marketplace' ? 'bg-blue-100 text-blue-600' :
                mapping.platform === 'Whatnot' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {mapping.category}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">List Price:</span>
                <span className="font-medium">${mapping.originalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fees:</span>
                <span className="text-red-600">-${mapping.sellerFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">You Receive:</span>
                <span className="font-bold text-green-600">${mapping.priceAfterFees.toFixed(2)}</span>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <h5 className="font-medium text-xs text-gray-700 mb-2">Platform Fields:</h5>
                <div className="space-y-1">
                  {Object.entries(mapping.platformFields).filter(([key]) => 
                    // Only show important fields
                    ['condition', 'brand', 'leafCategoryId', 'size', 'color', 'category'].includes(key)
                  ).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-gray-700 truncate max-w-[150px]" title={String(value)}>
                        {value || 'null'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UnifiedPlatformMapping;
