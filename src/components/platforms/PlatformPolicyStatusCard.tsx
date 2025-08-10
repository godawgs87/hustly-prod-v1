import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlatformRegistry } from '@/services/platforms/PlatformRegistry';

interface PolicyStatus {
  isValid: boolean;
  policies: {
    paymentPolicyId?: string;
    returnPolicyId?: string;
    fulfillmentPolicyId?: string;
    createdAt?: string;
  };
  needsRefresh: boolean;
}

interface PlatformPolicyStatusCardProps {
  platformId: string;
}

const PlatformPolicyStatusCard: React.FC<PlatformPolicyStatusCardProps> = ({ platformId }) => {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const platform = PlatformRegistry.getInstance().get(platformId);
  const platformName = platform?.name || platformId;

  useEffect(() => {
    checkPolicyStatus();
  }, [platformId]);

  const checkPolicyStatus = async () => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // For now, only eBay has policies. Other platforms can be added here
      if (platformId === 'ebay') {
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id, ebay_policies_created_at')
          .eq('id', userData.user.id)
          .single();

        if (error) throw error;

        const placeholderPolicies = [
          'DEFAULT_PAYMENT_POLICY', 'DEFAULT_RETURN_POLICY', 'DEFAULT_FULFILLMENT_POLICY',
          'INDIVIDUAL_PAYMENT_POLICY', 'INDIVIDUAL_RETURN_POLICY', 'INDIVIDUAL_FULFILLMENT_POLICY'
        ];

        const hasPlaceholderPolicies = placeholderPolicies.includes(userProfile?.ebay_payment_policy_id) ||
                                       placeholderPolicies.includes(userProfile?.ebay_return_policy_id) ||
                                       placeholderPolicies.includes(userProfile?.ebay_fulfillment_policy_id) ||
                                       !userProfile?.ebay_payment_policy_id ||
                                       !userProfile?.ebay_return_policy_id ||
                                       !userProfile?.ebay_fulfillment_policy_id;

        const hasShortPolicyIds = userProfile?.ebay_payment_policy_id?.length < 15 ||
                                  userProfile?.ebay_return_policy_id?.length < 15 ||
                                  userProfile?.ebay_fulfillment_policy_id?.length < 15;

        const needsRefresh = hasPlaceholderPolicies || hasShortPolicyIds;
        const isValid = !needsRefresh;

        setPolicyStatus({
          isValid,
          needsRefresh,
          policies: {
            paymentPolicyId: userProfile?.ebay_payment_policy_id,
            returnPolicyId: userProfile?.ebay_return_policy_id,
            fulfillmentPolicyId: userProfile?.ebay_fulfillment_policy_id,
            createdAt: userProfile?.ebay_policies_created_at
          }
        });
      } else {
        // For platforms without policies, show as valid
        setPolicyStatus({
          isValid: true,
          needsRefresh: false,
          policies: {}
        });
      }

    } catch (error: any) {
      console.error('Failed to check policy status:', error);
      toast({
        title: "Failed to Check Policies",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshPolicies = async () => {
    try {
      setRefreshing(true);
      console.log(`🔄 Refreshing ${platformName} policies...`);
      
      // Platform-specific policy refresh
      if (platformId === 'ebay') {
        const { data, error } = await supabase.functions.invoke('ebay-policy-manager', {
          body: {}
        });

        if (error) {
          console.error('❌ Policy refresh failed:', error);
          throw new Error(error.message || 'Policy refresh failed');
        }
        
        console.log('✅ Policy refresh result:', data);

        if (data?.status === 'success') {
          toast({
            title: `✅ ${platformName} Policies Updated!`,
            description: `Your ${platformName} policies have been refreshed and are ready for listing sync.`
          });
          
          // Refresh status
          await checkPolicyStatus();
        } else if (data?.status === 'error') {
          // Handle the improved error response format
          let errorTitle = "❌ Policy Setup Failed";
          let errorDescription = data.error || `Failed to configure ${platformName} policies`;
          
          if (data.needs_reconnection) {
            errorTitle = `🔗 ${platformName} Connection Issue`;
            errorDescription = `Your ${platformName} connection needs to be refreshed. Please reconnect your ${platformName} account.`;
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
            action: data.needs_reconnection ? (
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings?tab=connections'}>
                Reconnect {platformName}
              </Button>
            ) : undefined
          });
        } else {
          toast({
            title: "ℹ️ Policies Already Current",
            description: `Your ${platformName} policies are already up to date.`
          });
        }
      } else {
        // For platforms without policies
        toast({
          title: "No Policies Required",
          description: `${platformName} does not require business policies.`
        });
      }
    } catch (error: any) {
      console.error('Failed to refresh policies:', error);
      
      // Parse the error for better user guidance
      let errorTitle = "❌ Policy Refresh Failed";
      let errorDescription = error.message || `Please ensure your ${platformName} account is properly connected`;
      
      if (error.message?.includes('token') || error.message?.includes('expired')) {
        errorTitle = `🔗 ${platformName} Connection Expired`;
        errorDescription = `Your ${platformName} connection has expired. Please reconnect your ${platformName} account.`;
      } else if (error.message?.includes('not connected')) {
        errorTitle = `🔗 ${platformName} Not Connected`;
        errorDescription = `Please connect your ${platformName} account first before refreshing policies.`;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {platformName} Policy Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Checking policy status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show policy card for platforms without policies
  if (platformId !== 'ebay') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {policyStatus?.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          {platformName} Policy Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {policyStatus?.isValid ? (
          <>
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Your {platformName} policies are configured and ready for listing sync.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Policy</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {policyStatus.policies.paymentPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Return Policy</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {policyStatus.policies.returnPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shipping Policy</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {policyStatus.policies.fulfillmentPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
            </div>

            {policyStatus.policies.createdAt && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(policyStatus.policies.createdAt).toLocaleDateString()}
              </div>
            )}
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Your {platformName} policies need to be configured or refreshed before you can sync listings.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={refreshPolicies} 
              disabled={refreshing}
              className="w-full"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing Policies...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh {platformName} Policies
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground">
              This will fetch your current business policies from {platformName} and configure them for listing sync.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformPolicyStatusCard;
