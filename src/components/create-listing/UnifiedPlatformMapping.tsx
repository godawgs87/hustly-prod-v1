import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListingData } from '@/types/CreateListing';

interface PlatformMapping {
  platform: string;
  icon: string;
  category: string;
  originalPrice: number;
  sellerFees: number;
  priceAfterFees: number;
  platformFields: Record<string, any>;
}

interface UnifiedPlatformMappingProps {
  listingData: ListingData;
  basePrice: number;
}

const PLATFORM_CONFIGS = {
  ebay: {
    name: 'eBay',
    icon: '🛒',
    feeRate: 0.1295, // 12.95% final value fee
    color: 'bg-blue-100 text-blue-800',
    extractFields: (data: ListingData) => ({
      condition: data.condition,
      brand: data.brand,
      mpn: extractMPN(data.title || ''),
      upc: extractUPC(data.description || ''),
      itemSpecifics: {
        Brand: data.brand,
        Condition: data.condition,
        Color: data.color,
        Material: data.material,
        Size: data.size
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
      shippingWeight: data.shipping_weight
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
      category: mapCategoryToPoshmark(data.category)
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
      era: extractEra(data.description || '')
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
      category: mapCategoryToFacebook(data.category)
    })
  }
};

// Helper functions to extract platform-specific data
function extractMPN(title: string): string | null {
  const mpnMatch = title.match(/\b[A-Z0-9]{3,}-[A-Z0-9]{3,}\b/);
  return mpnMatch ? mpnMatch[0] : null;
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
  }
  return 'Other';
}

function mapCategoryToFacebook(category: any): string {
  if (typeof category === 'object' && category?.primary) {
    return category.primary;
  }
  return typeof category === 'string' ? category : 'Other';
}

const UnifiedPlatformMapping: React.FC<UnifiedPlatformMappingProps> = ({
  listingData,
  basePrice
}) => {
  const generatePlatformMappings = (): PlatformMapping[] => {
    return Object.entries(PLATFORM_CONFIGS).map(([key, config]) => {
      const sellerFees = basePrice * config.feeRate;
      const priceAfterFees = basePrice - sellerFees;
      
      return {
        platform: config.name,
        icon: config.icon,
        category: getCategoryForPlatform(key, listingData.category),
        originalPrice: basePrice,
        sellerFees,
        priceAfterFees,
        platformFields: config.extractFields(listingData)
      };
    });
  };

  const getCategoryForPlatform = (platform: string, category: any): string => {
    // This would integrate with your existing category mapping services
    if (typeof category === 'object' && category?.primary) {
      return category.primary;
    }
    return typeof category === 'string' ? category : 'Other';
  };

  const mappings = generatePlatformMappings();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cross-Platform Mapping</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mappings.map((mapping) => (
          <Card key={mapping.platform} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{mapping.icon}</span>
                <h4 className="font-semibold">{mapping.platform}</h4>
              </div>
              <Badge className={PLATFORM_CONFIGS[mapping.platform.toLowerCase().replace(' ', '')]?.color}>
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
                  {Object.entries(mapping.platformFields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span className="text-gray-700">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
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
