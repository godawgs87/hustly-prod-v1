
// Shipping cost calculation utilities for bulk upload
// This should match the shipping options available in single upload

export interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  days?: string;
  estimatedDays?: string;
  description?: string;
}

export const calculateShippingCost = (
  weight: number,
  dimensions: { length: number; width: number; height: number },
  serviceType: 'ground' | 'expedited' | 'priority' = 'ground'
): number => {
  // More realistic shipping cost calculation based on weight and size
  const baseRate = 4.95;
  
  // Calculate dimensional weight (length * width * height / 166 for USPS)
  const dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
  const billableWeight = Math.max(weight, dimensionalWeight);
  
  // Weight-based pricing tiers
  let weightRate;
  if (billableWeight <= 0.5) {
    weightRate = 1.50; // Small items like key fobs
  } else if (billableWeight <= 1) {
    weightRate = 2.25;
  } else if (billableWeight <= 2) {
    weightRate = 3.50;
  } else {
    weightRate = billableWeight * 2.25;
  }
  
  const serviceMultiplier = serviceType === 'priority' ? 1.8 : serviceType === 'expedited' ? 2.2 : 1.0;
  
  return Math.round((baseRate + weightRate) * serviceMultiplier * 100) / 100;
};

export const generateShippingOptions = (weight: number = 1): ShippingOption[] => {
  const dimensions = { length: 12, width: 8, height: 4 }; // Default dimensions
  
  // CRITICAL: Must include local pickup option (matching single upload)
  const shippingOptions: ShippingOption[] = [
    {
      id: 'local-pickup',
      name: 'Local Pickup',
      cost: 0,
      days: 'Same day',
      estimatedDays: 'Same day',
      description: 'Buyer picks up item in person - no shipping required'
    },
    {
      id: 'free-shipping',
      name: 'Free Shipping',
      cost: 0,
      days: '3-7 business days',
      estimatedDays: '3-7 business days',
      description: 'Free shipping included in item price'
    },
    {
      id: 'usps-ground',
      name: 'USPS Ground Advantage',
      cost: calculateShippingCost(weight, dimensions, 'ground'),
      days: '3-5 business days',
      estimatedDays: '3-5 business days',
      description: 'Reliable ground shipping with tracking'
    },
    {
      id: 'usps-priority',
      name: 'USPS Priority Mail',
      cost: calculateShippingCost(weight, dimensions, 'priority'),
      days: '1-3 business days',
      estimatedDays: '1-3 business days',
      description: 'Faster delivery with priority handling'
    },
    {
      id: 'usps-express',
      name: 'USPS Priority Mail Express',
      cost: calculateShippingCost(weight, dimensions, 'expedited'),
      days: '1-2 business days',
      estimatedDays: '1-2 business days',
      description: 'Fastest delivery option available'
    }
  ];

  return shippingOptions;
};
