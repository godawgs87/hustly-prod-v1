import { supabase } from '@/integrations/supabase/client';

export const testRealEbayServiceCodes = async () => {
  console.log('🔍 Testing REAL eBay service codes from eBay API...');
  
  try {
    // Test the shipping services fetcher to get real eBay service codes
    const response = await supabase.functions.invoke('test-shipping-services');
    
    console.log('📡 Raw response from test-shipping-services:', {
      data: response.data,
      error: response.error,
      hasData: !!response.data,
      hasError: !!response.error
    });

    if (response.error) {
      console.error('❌ Error testing shipping services:', response.error);
      return { success: false, error: response.error };
    }

    if (response.data?.databaseServices) {
      console.log('✅ REAL eBay service codes found:', {
        serviceCount: response.data.databaseServices.length,
        services: response.data.databaseServices.map((s: any) => ({
          code: s.service_code,
          name: s.service_name,
          domestic: s.is_domestic,
          international: s.is_international,
          active: s.is_active
        }))
      });

      // Extract just the service codes for easy reference
      const serviceCodes = response.data.databaseServices
        .filter((s: any) => s.is_active && s.is_domestic)
        .map((s: any) => s.service_code);
      
      console.log('🎯 REAL eBay domestic service codes we can use:', serviceCodes);
      
      return { 
        success: true, 
        data: response.data,
        realServiceCodes: serviceCodes
      };
    } else {
      console.log('⚠️ No services returned from eBay API');
      return { success: false, error: 'No services returned from eBay API' };
    }

  } catch (error: any) {
    console.error('❌ Exception testing real eBay service codes:', error);
    return { success: false, error: error.message };
  }
};

// Make it available in browser console for testing
declare global {
  interface Window {
    testRealEbayServiceCodes: typeof testRealEbayServiceCodes;
  }
}

if (typeof window !== 'undefined') {
  window.testRealEbayServiceCodes = testRealEbayServiceCodes;
}