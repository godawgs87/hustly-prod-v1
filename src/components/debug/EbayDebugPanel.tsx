import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bug, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
const EbayDebugPanel = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const {
    toast
  } = useToast();
  const testEbayConnection = async () => {
    setTesting(true);
    setResults(null);
    try {
      console.log('🔍 Testing eBay connection...');

      // Call our edge function to test connection server-side
      const {
        data,
        error
      } = await supabase.functions.invoke('ebay-integration', {
        body: {
          action: 'test_connection'
        }
      });
      if (error) {
        throw new Error(`Connection test failed: ${error.message}`);
      }
      if (data?.status === 'success') {
        setResults(data);
        if (data.apiTest?.ok) {
          toast({
            title: "eBay Connection Healthy ✅",
            description: "Your eBay account is properly connected and API calls are working"
          });
        } else {
          toast({
            title: "eBay API Issue ⚠️",
            description: `API call failed with status ${data.apiTest?.status}`,
            variant: "destructive"
          });
        }
      } else {
        throw new Error(data?.error || 'Unknown connection test error');
      }
    } catch (error: any) {
      console.error('❌ eBay test failed:', error);
      setResults({
        error: error.message,
        accountFound: false
      });
      toast({
        title: "eBay Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };
  const testListingSync = async () => {
    try {
      // Get first listing to test with
      const {
        data: listings
      } = await supabase.from('listings').select('id, title, price').limit(1).single();
      if (!listings) {
        toast({
          title: "No Listings Found",
          description: "Create a listing first to test sync functionality",
          variant: "destructive"
        });
        return;
      }
      console.log('🔄 Testing sync with listing:', listings.id);

      // Call eBay integration function
      const {
        data,
        error
      } = await supabase.functions.invoke('ebay-integration', {
        body: {
          action: 'publish_listing',
          listingId: listings.id
        }
      });
      console.log('📦 Sync test response:', {
        data,
        error
      });
      if (error) {
        toast({
          title: "Sync Test Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data?.status === 'success') {
        toast({
          title: "Sync Test Successful! 🎉",
          description: `Listing "${listings.title}" synced to eBay`
        });
      } else {
        toast({
          title: "Sync Test Issue",
          description: data?.error || 'Unknown sync error',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Sync Test Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return;
};
export default EbayDebugPanel;