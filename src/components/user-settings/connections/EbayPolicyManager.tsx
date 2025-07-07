import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EbayPolicyRefreshButton from './EbayPolicyRefreshButton';

interface PolicyStatus {
  hasPolicies: boolean;
  policies: {
    paymentPolicyId?: string;
    returnPolicyId?: string;
    fulfillmentPolicyId?: string;
    createdAt?: string;
  };
}

const EbayPolicyManager = () => {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPolicyStatus();
  }, []);

  const checkPolicyStatus = async () => {
    try {
      setLoading(true);
      
      // Check user profile for existing policies
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id, ebay_policies_created_at')
        .eq('id', userData.user.id)
        .single();

      if (error) throw error;

      // Check if policies are placeholders
      const hasPlaceholderPolicies = userProfile?.ebay_payment_policy_id === 'DEFAULT_PAYMENT_POLICY' ||
                                     userProfile?.ebay_return_policy_id === 'DEFAULT_RETURN_POLICY' ||
                                     userProfile?.ebay_fulfillment_policy_id === 'DEFAULT_FULFILLMENT_POLICY' ||
                                     !userProfile?.ebay_payment_policy_id ||
                                     !userProfile?.ebay_return_policy_id ||
                                     !userProfile?.ebay_fulfillment_policy_id;

      const hasPolicies = !hasPlaceholderPolicies;

      setPolicyStatus({
        hasPolicies,
        policies: {
          paymentPolicyId: userProfile?.ebay_payment_policy_id,
          returnPolicyId: userProfile?.ebay_return_policy_id,
          fulfillmentPolicyId: userProfile?.ebay_fulfillment_policy_id,
          createdAt: userProfile?.ebay_policies_created_at
        }
      });

      // Auto-fix placeholder policies
      if (hasPlaceholderPolicies) {
        console.log('Detected placeholder policies, automatically refreshing...');
        await createPolicies();
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

  const createPolicies = async () => {
    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke('ebay-policy-manager', {
        body: {}
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.isPersonalAccount) {
        toast({
          title: "eBay Account Configured! ✅",
          description: "Your personal eBay account is ready. Listings will use eBay's default policies, just like Nifty and other tools."
        });
      } else {
        toast({
          title: "eBay Policies Created! 🎉",
          description: "Your business policies are now ready for listing creation"
        });
      }

      // Refresh status
      await checkPolicyStatus();
    } catch (error: any) {
      console.error('Failed to create policies:', error);
      toast({
        title: "Configuration Failed",
        description: error.message || "Please ensure your eBay account is properly connected",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            eBay Business Policies
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
          {policyStatus?.hasPolicies ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          )}
          eBay Business Policies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {policyStatus?.hasPolicies ? (
          <>
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {policyStatus.policies.paymentPolicyId === 'DEFAULT_PAYMENT_POLICY' ? (
                  <>Your personal eBay account is configured to use eBay's standard policies. This is normal for individual sellers and works just like other listing tools.</>
                ) : (
                  <>Your eBay business policies are created and ready for use. All listings will use these policies automatically.</>
                )}
              </AlertDescription>
            </Alert>

            {policyStatus.policies.paymentPolicyId !== 'DEFAULT_PAYMENT_POLICY' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Payment Policy</h4>
                  <Badge variant="secondary" className="text-xs">
                    {policyStatus.policies.paymentPolicyId?.substring(0, 12)}...
                  </Badge>
                  <p className="text-sm text-gray-600">
                    PayPal & Credit Card payments, immediate payment required
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Return Policy</h4>
                  <Badge variant="secondary" className="text-xs">
                    {policyStatus.policies.returnPolicyId?.substring(0, 12)}...
                  </Badge>
                  <p className="text-sm text-gray-600">
                    30-day returns, buyer pays shipping
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Fulfillment Policy</h4>
                  <Badge variant="secondary" className="text-xs">
                    {policyStatus.policies.fulfillmentPolicyId?.substring(0, 12)}...
                  </Badge>
                  <p className="text-sm text-gray-600">
                    1-day handling, domestic shipping
                  </p>
                </div>
              </div>
            )}

            {policyStatus.policies.paymentPolicyId === 'DEFAULT_PAYMENT_POLICY' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Using eBay Standard Policies</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• PayPal and credit card payments</li>
                  <li>• Standard return policy</li>
                  <li>• Calculated shipping options</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  This is the same setup used by tools like Nifty, Crosslist, and other listing platforms.
                </p>
              </div>
            )}

            {policyStatus.policies.createdAt && (
              <p className="text-sm text-gray-500">
                Created on {new Date(policyStatus.policies.createdAt).toLocaleDateString()}
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={checkPolicyStatus}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>⚠️ Problem Detected:</strong> Your eBay policies are placeholder values that eBay will reject. We need to fetch your real eBay policy IDs to fix this.
              </AlertDescription>
            </Alert>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">🔧 Quick Fix Required</h4>
              <p className="text-sm text-red-800 mb-3">
                Your eBay connection is valid, but we need to fetch your actual policy IDs from eBay to replace the placeholder values.
              </p>
              <EbayPolicyRefreshButton />
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">What this will do:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Fetch your real eBay policy IDs using your existing OAuth token</li>
                <li>• Replace placeholder values with actual eBay policy identifiers</li>
                <li>• Enable successful inventory sync to eBay</li>
              </ul>
            </div>

            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Note:</strong> Individual eBay accounts cannot create custom business policies. This is normal and expected.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={createPolicies}
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Policies...
                </>
              ) : (
                'Create eBay Business Policies'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EbayPolicyManager;