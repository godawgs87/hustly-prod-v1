import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Receipt, Building2, User } from 'lucide-react';

const UserBillingFinanceTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [financialData, setFinancialData] = useState({
    account_type: 'individual'
  });

  const {
    subscriptionStatus,
    checkSubscription,
    openCustomerPortal
  } = useSubscriptionManagement();

  useEffect(() => {
    if (user) {
      loadFinancialData();
      checkSubscription();
    }
  }, [user]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('account_type')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setFinancialData({
          account_type: data.account_type || 'individual'
        });
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_type: financialData.account_type
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Financial settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save financial settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFinancialData(prev => ({ ...prev, [field]: value }));
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames: { [key: string]: string } = {
      'trial': 'Trial',
      'side_hustler': 'Side Hustler',
      'serious_seller': 'Serious Seller',
      'full_time_flipper': 'Full-Time Flipper',
      'founders': 'Founders'
    };
    return tierNames[tier] || tier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionStatus.subscribed ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="font-medium">
                    {getTierDisplayName(subscriptionStatus.subscription_tier)} Plan
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="default">Active</Badge>
                  </p>
                  {subscriptionStatus.subscription_end && (
                    <p className="text-sm text-muted-foreground">
                      Next billing: {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button onClick={openCustomerPortal} variant="outline">
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active subscription found</p>
              <Button>Subscribe Now</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Settings</CardTitle>
          <CardDescription>
            Configure your tax and business information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Account Type</Label>
              <RadioGroup
                value={financialData.account_type}
                onValueChange={(value) => handleInputChange('account_type', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Individual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    Business
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID (Optional)</Label>
                <Input
                  id="tax_id"
                  placeholder="Enter tax ID"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to update tax information
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name (Optional)</Label>
                <Input
                  id="business_name"
                  placeholder="Enter business name"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Update this in the Business tab
                </p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
              {saving ? 'Saving...' : 'Save Financial Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserBillingFinanceTab;