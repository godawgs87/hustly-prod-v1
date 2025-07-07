import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EbayPolicyRefreshButton = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const refreshPolicies = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Manually triggering eBay policy refresh...');
      
      const { data, error } = await supabase.functions.invoke('ebay-policy-manager', {
        body: {}
      });

      if (error) {
        console.error('❌ Policy refresh error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('❌ Policy refresh failed:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Policy refresh result:', data);

      if (data?.status === 'success') {
        toast({
          title: "✅ eBay Policies Updated!",
          description: "Your real eBay policy IDs have been fetched and stored. You can now sync listings to eBay."
        });
      } else {
        toast({
          title: "ℹ️ Policies Already Current",
          description: "Your eBay policies are already up to date."
        });
      }
    } catch (error: any) {
      console.error('Failed to refresh policies:', error);
      toast({
        title: "❌ Policy Refresh Failed",
        description: error.message || "Please ensure your eBay account is properly connected",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button 
      onClick={refreshPolicies}
      disabled={refreshing}
      variant="default"
      className="w-full"
    >
      {refreshing ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Fetching Real Policy IDs...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Fix eBay Policies Now
        </>
      )}
    </Button>
  );
};

export default EbayPolicyRefreshButton;