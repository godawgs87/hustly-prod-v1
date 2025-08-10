import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';

interface PolicyStatus {
  hasPolicies: boolean;
  policies: {
    paymentPolicyId?: string;
    returnPolicyId?: string;
    fulfillmentPolicyId?: string;
    createdAt?: string;
  };
}

interface PlatformPolicyManagerProps {
  platformId: string;
  RefreshButtonComponent?: React.ComponentType<{ onRefresh: () => void }>;
}

const PlatformPolicyManager: React.FC<PlatformPolicyManagerProps> = ({ 
  platformId,
  RefreshButtonComponent 
}) => {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const platform = platformRegistry.get(platformId);
  const platformName = platform?.name || platformId;

  useEffect(() => {
    checkPolicyStatus();
  }, [platformId]);

  const checkPolicyStatus = async () => {
    try {
      setLoading(true);
      
      // Check user profile for existing policies
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Platform-specific policy field mapping
      const policyFields: Record<string, string[]> = {
        ebay: [
          'ebay_payment_policy_id', 
          'ebay_return_policy_id', 
          'ebay_fulfillment_policy_id',
          'ebay_policies_created_at'
        ],
        poshmark: [
          'poshmark_payment_policy_id',
          'poshmark_return_policy_id', 
          'poshmark_shipping_policy_id',
          'poshmark_policies_created_at'
        ],
        mercari: [
          'mercari_payment_policy_id',
          'mercari_return_policy_id',
          'mercari_shipping_policy_id', 
          'mercari_policies_created_at'
        ]
      };

      const fields = policyFields[platformId] || [];
      if (fields.length === 0) {
        setPolicyStatus({ hasPolicies: false, policies: {} });
        setLoading(false);
        return;
      }

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select(fields.join(', '))
        .eq('id', userData.user.id)
        .single();

      if (error) throw error;

      // Check if policies are placeholders or missing
      const paymentPolicyField = fields[0];
      const returnPolicyField = fields[1];
      const fulfillmentPolicyField = fields[2];
      const createdAtField = fields[3];

      const hasPlaceholderPolicies = 
        userProfile?.[paymentPolicyField] === 'DEFAULT_PAYMENT_POLICY' ||
        userProfile?.[returnPolicyField] === 'DEFAULT_RETURN_POLICY' ||
        userProfile?.[fulfillmentPolicyField] === 'DEFAULT_FULFILLMENT_POLICY' ||
        !userProfile?.[paymentPolicyField] ||
        !userProfile?.[returnPolicyField] ||
        !userProfile?.[fulfillmentPolicyField];

      const hasPolicies = !hasPlaceholderPolicies;

      setPolicyStatus({
        hasPolicies,
        policies: {
          paymentPolicyId: userProfile?.[paymentPolicyField],
          returnPolicyId: userProfile?.[returnPolicyField],
          fulfillmentPolicyId: userProfile?.[fulfillmentPolicyField],
          createdAt: userProfile?.[createdAtField]
        }
      });

      // Auto-fix placeholder policies for eBay
      if (platformId === 'ebay' && hasPlaceholderPolicies) {
        console.log(`Detected placeholder ${platformName} policies, automatically refreshing...`);
        await createPolicies();
      }
    } catch (error: any) {
      console.error(`Failed to check ${platformName} policy status:`, error);
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
      
      // Platform-specific policy endpoints
      const policyEndpoint = `${platformId}-policy-manager`;
      
      const { data, error } = await supabase.functions.invoke(policyEndpoint, {
        body: {}
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.isPersonalAccount) {
        toast({
          title: `${platformName} Account Configured! ✅`,
          description: `Your personal ${platformName} account is ready. Listings will use ${platformName}'s default policies.`
        });
      } else {
        toast({
          title: "Business Policies Created! 🎉",
          description: `Your ${platformName} business policies have been set up successfully`
        });
      }

      await checkPolicyStatus();
    } catch (error: any) {
      console.error(`Failed to create ${platformName} policies:`, error);
      toast({
        title: "Policy Creation Failed",
        description: error.message || `Failed to create ${platformName} policies`,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Checking {platformName} policies...</span>
        </CardContent>
      </Card>
    );
  }

  const isPersonalAccount = policyStatus?.policies.paymentPolicyId === 'PERSONAL_ACCOUNT';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{platformName} Business Policies</span>
          {policyStatus?.hasPolicies && !isPersonalAccount && RefreshButtonComponent && (
            <RefreshButtonComponent onRefresh={checkPolicyStatus} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPersonalAccount ? (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Personal {platformName} Account</strong>
              <br />
              Your account is configured as a personal seller account. Listings will use {platformName}'s default policies automatically.
            </AlertDescription>
          </Alert>
        ) : policyStatus?.hasPolicies ? (
          <>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Business policies are configured and ready to use
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Payment Policy</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {policyStatus.policies.paymentPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Return Policy</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {policyStatus.policies.returnPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Shipping Policy</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {policyStatus.policies.fulfillmentPolicyId?.substring(0, 8)}...
                </Badge>
              </div>
            </div>
            
            {policyStatus.policies.createdAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Created {new Date(policyStatus.policies.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No {platformName} business policies found. Create policies to enable listing features.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={createPolicies} 
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating Policies...
                </>
              ) : (
                'Create Business Policies'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformPolicyManager;
