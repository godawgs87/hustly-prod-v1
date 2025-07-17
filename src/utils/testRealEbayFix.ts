import { supabase } from '@/integrations/supabase/client';

export const testRealEbayFix = async (listingId: string) => {
  console.log('🧪 TESTING REAL EBAY SERVICE CODE FIX...', { listingId });
  
  try {
    // Test the eBay inventory sync with the updated real service codes
    const response = await supabase.functions.invoke('ebay-inventory-sync', {
      body: {
        listingId,
        dryRun: true // Test mode
      }
    });

    console.log('📡 Response from eBay sync with real service codes:', {
      success: response.data?.success,
      error: response.error,
      errorCode: response.error?.context?.errorCode,
      errorMessage: response.error?.message,
      shippingService: response.data?.shippingServiceUsed,
      fullResponse: JSON.stringify(response, null, 2)
    });

    if (response.error?.context?.errorCode === '25007') {
      console.error('❌ Still getting Error 25007 - need to investigate further');
      return { success: false, error: 'Still getting Error 25007 with real eBay codes' };
    }

    if (response.data?.success) {
      console.log('✅ SUCCESS! Real eBay service codes are working');
      return { success: true, data: response.data };
    }

    console.log('⚠️ No success flag, but no Error 25007 either');
    return { success: false, data: response.data, error: response.error };

  } catch (error: any) {
    console.error('❌ Exception testing real eBay fix:', error);
    return { success: false, error: error.message };
  }
};

// Make it available in browser console for testing
declare global {
  interface Window {
    testRealEbayFix: typeof testRealEbayFix;
  }
}

if (typeof window !== 'undefined') {
  window.testRealEbayFix = testRealEbayFix;
}