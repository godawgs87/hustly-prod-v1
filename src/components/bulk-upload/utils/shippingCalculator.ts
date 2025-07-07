
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
  // Basic shipping cost calculation
  const baseRate = 5.95;
  const weightRate = weight * 2.50;
  const sizeMultiplier = serviceType === 'priority' ? 1.8 : serviceType === 'expedited' ? 1.5 : 1.0;
  
  return Math.round((baseRate + weightRate) * sizeMultiplier * 100) / 100;
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
