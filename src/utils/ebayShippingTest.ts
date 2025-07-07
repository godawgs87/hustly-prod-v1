import { supabase } from '@/integrations/supabase/client';

export const testEbayShippingService = async (userPreference = 'usps_priority') => {
  console.log('🧪 Testing eBay shipping service module...', { userPreference });
  
  try {
    const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
      body: {
        action: 'test_shipping_service',
        userPreference,
        dryRun: true
      }
    });

    if (error) {
      console.error('❌ Shipping service test failed:', error);
      return { success: false, error };
    }

    console.log('✅ Shipping service test results:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Shipping service test exception:', error);
    return { success: false, error: error.message };
  }
};

// Convenience function to test all shipping preferences
export const testAllShippingPreferences = async () => {
  const preferences = [
    'usps_priority',
    'usps_first_class',
    'usps_ground',
    'ups_ground',
    'standard',
    'expedited',
    'overnight',
    'express'
  ];

  console.log('🧪 Testing all shipping preferences...');
  
  const results = [];
  for (const preference of preferences) {
    const result = await testEbayShippingService(preference);
    results.push({ preference, ...result });
  }

  console.log('🧪 All shipping preference test results:', results);
  return results;
};