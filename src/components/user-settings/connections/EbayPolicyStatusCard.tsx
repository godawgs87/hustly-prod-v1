import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const EbayPolicyStatusCard = () => {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPolicyStatus();
  }, []);

  const checkPolicyStatus = async () => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

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
      console.log('🔄 Refreshing eBay policies...');
      
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
          title: "✅ eBay Policies Updated!",
          description: "Your eBay policies have been refreshed and are ready for listing sync."
        });
        
        // Refresh status
        await checkPolicyStatus();
      } else if (data?.status === 'error') {
        // Handle the improved error response format
        let errorTitle = "❌ Policy Setup Failed";
        let errorDescription = data.error || "Failed to configure eBay policies";
        
        if (data.needs_reconnection) {
          errorTitle = "🔗 eBay Connection Issue";
          errorDescription = "Your eBay connection needs to be refreshed. Please reconnect your eBay account.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          action: data.needs_reconnection ? (
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings?tab=connections'}>
              Reconnect eBay
            </Button>
          ) : undefined
        });
      } else {
        toast({
          title: "ℹ️ Policies Already Current",
          description: "Your eBay policies are already up to date."
        });
      }
    } catch (error: any) {
      console.error('Failed to refresh policies:', error);
      
      // Parse the error for better user guidance
      let errorTitle = "❌ Policy Refresh Failed";
      let errorDescription = error.message || "Please ensure your eBay account is properly connected";
      
      if (error.message?.includes('token') || error.message?.includes('expired')) {
        errorTitle = "🔗 eBay Connection Expired";
        errorDescription = "Your eBay connection has expired. Please reconnect your eBay account.";
      } else if (error.message?.includes('not connected')) {
        errorTitle = "🔗 eBay Not Connected";
        errorDescription = "Please connect your eBay account first before refreshing policies.";
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
            eBay Policy Status
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {policyStatus?.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          eBay Policy Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {policyStatus?.isValid ? (
          <>
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Your eBay policies are configured and ready for listing sync.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Current Policy IDs:</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Payment Policy:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {policyStatus.policies.paymentPolicyId?.substring(0, 12)}...
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Return Policy:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {policyStatus.policies.returnPolicyId?.substring(0, 12)}...
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Fulfillment Policy:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {policyStatus.policies.fulfillmentPolicyId?.substring(0, 12)}...
                  </Badge>
                </div>
              </div>
            </div>

            {policyStatus.policies.createdAt && (
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(policyStatus.policies.createdAt).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>⚠️ Policy Issue Detected:</strong> Your eBay policies have placeholder or invalid values that will cause listing sync failures. 
                Click "Refresh Policies" to fetch your real eBay policy IDs.
              </AlertDescription>
            </Alert>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">🔧 What's Wrong?</h4>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>• Your stored policy IDs are placeholder values</li>
                <li>• eBay requires real policy IDs to publish listings</li>
                <li>• This causes Error 25007 during listing sync</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Fix Required:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Fetch your actual eBay policy IDs using your OAuth token</li>
                <li>• Replace placeholder values with real policy identifiers</li>
                <li>• Enable successful listing sync to eBay</li>
              </ul>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={refreshPolicies}
            disabled={refreshing}
            variant={policyStatus?.isValid ? "outline" : "default"}
            className="flex-1"
          >
            {refreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refreshing Policies...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {policyStatus?.isValid ? 'Refresh Policies' : 'Fix Policies Now'}
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={checkPolicyStatus}
            disabled={loading || refreshing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EbayPolicyStatusCard;