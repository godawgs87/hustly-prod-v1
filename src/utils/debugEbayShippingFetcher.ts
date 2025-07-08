import { supabase } from '@/integrations/supabase/client';

export const debugEbayShippingFetcher = async (userId: string, forceRefresh = true) => {
  console.log('🧪 DEBUG: Testing eBay shipping services fetcher directly...', { userId, forceRefresh });
  
  try {
    const response = await supabase.functions.invoke('ebay-shipping-services-fetcher', {
      body: { userId, forceRefresh }
    });

    console.log('🧪 DEBUG: Raw response from fetcher:', {
      data: response.data,
      error: response.error,
      hasData: !!response.data,
      hasError: !!response.error,
      errorDetails: response.error ? {
        message: response.error.message,
        details: response.error
      } : null
    });

    if (response.error) {
      console.error('❌ DEBUG: Fetcher returned error:', response.error);
      return { success: false, error: response.error };
    }

    if (response.data?.services) {
      console.log('✅ DEBUG: Fetcher returned services:', {
        serviceCount: response.data.services.length,
        services: response.data.services,
        cached: response.data.cached
      });
    } else {
      console.log('⚠️ DEBUG: No services in response data:', response.data);
    }

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ DEBUG: Exception calling fetcher:', error);
    return { success: false, error: error.message };
  }
};

// Test function that can be called from browser console
declare global {
  interface Window {
    debugEbayShippingFetcher: typeof debugEbayShippingFetcher;
  }
}

if (typeof window !== 'undefined') {
  window.debugEbayShippingFetcher = debugEbayShippingFetcher;
}