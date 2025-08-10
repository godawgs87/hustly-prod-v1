import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';

interface PlatformPolicyRefreshButtonProps {
  platformId: string;
  onRefresh?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
}

const PlatformPolicyRefreshButton: React.FC<PlatformPolicyRefreshButtonProps> = ({ 
  platformId,
  onRefresh,
  variant = 'default',
  className = 'w-full'
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  
  const platform = platformRegistry.get(platformId);
  const platformName = platform?.name || platformId;

  const refreshPolicies = async () => {
    try {
      setRefreshing(true);
      console.log(`🔄 Manually triggering ${platformName} policy refresh...`);
      
      // Platform-specific policy endpoints
      const policyEndpoint = `${platformId}-policy-manager`;
      
      const { data, error } = await supabase.functions.invoke(policyEndpoint, {
        body: {}
      });

      if (error) {
        console.error(`❌ ${platformName} policy refresh error:`, error);
        throw error;
      }

      if (data?.error) {
        console.error(`❌ ${platformName} policy refresh failed:`, data.error);
        throw new Error(data.error);
      }

      console.log(`✅ ${platformName} policy refresh result:`, data);

      if (data?.status === 'success') {
        toast({
          title: `✅ ${platformName} Policies Updated!`,
          description: `Your real ${platformName} policy IDs have been fetched and stored. You can now sync listings to ${platformName}.`
        });
      } else {
        toast({
          title: "ℹ️ Policies Already Current",
          description: `Your ${platformName} policies are already up to date.`
        });
      }
      
      // Call the optional refresh callback
      onRefresh?.();
    } catch (error: any) {
      console.error(`Failed to refresh ${platformName} policies:`, error);
      toast({
        title: `❌ ${platformName} Policy Refresh Failed`,
        description: error.message || `Please ensure your ${platformName} account is properly connected`,
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
      variant={variant}
      className={className}
    >
      {refreshing ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Fetching Real Policy IDs...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Fix {platformName} Policies Now
        </>
      )}
    </Button>
  );
};

export default PlatformPolicyRefreshButton;
