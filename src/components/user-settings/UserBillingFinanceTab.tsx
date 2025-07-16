import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, ShoppingCart, FileText, Download, Calendar, TrendingUp, Package, Receipt } from 'lucide-react';

const UserBillingFinanceTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userAddons, setUserAddons] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  const {
    subscriptionStatus,
    checkSubscription,
    openCustomerPortal
  } = useSubscriptionManagement();

  useEffect(() => {
    if (user) {
      loadBillingData();
      checkSubscription();
    }
  }, [user]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Load user profile for usage data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('listings_used_this_cycle, billing_cycle_start, billing_cycle_end')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Load user add-ons
      const { data: addonsData, error: addonsError } = await supabase
        .from('user_addons')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (addonsError) throw addonsError;
      setUserAddons(addonsData || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseAddon = async (addonType: string, addonValue: number, price: number) => {
    try {
      const billingCycleStart = new Date();
      const billingCycleEnd = new Date();
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

      const { error } = await supabase
        .from('user_addons')
        .insert({
          user_id: user?.id,
          addon_type: addonType,
          addon_value: addonValue,
          price_paid: price,
          billing_cycle_start: billingCycleStart.toISOString().split('T')[0],
          billing_cycle_end: billingCycleEnd.toISOString().split('T')[0],
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${addonType === 'extra_listings' ? 'Extra listings' : 'Marketplace access'} purchased successfully`
      });
      
      loadBillingData();
    } catch (error) {
      console.error('Error purchasing addon:', error);
      toast({
        title: 'Error',
        description: 'Failed to purchase addon',
        variant: 'destructive'
      });
    }
  };

  const exportTaxDocuments = () => {
    // This would integrate with your backend to generate tax documents
    toast({
      title: 'Export Started',
      description: 'Your tax documents will be ready for download shortly'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

  const getUsageLimits = (tier: string) => {
    const limits = {
      'trial': { listings: 10, marketplaces: 1 },
      'side_hustler': { listings: 50, marketplaces: 2 },
      'serious_seller': { listings: 200, marketplaces: 3 },
      'full_time_flipper': { listings: 1000, marketplaces: 5 },
      'founders': { listings: 999999, marketplaces: 10 }
    };
    return limits[tier] || limits['trial'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentLimits = getUsageLimits(subscriptionStatus?.subscription_tier || 'trial');
  const listingsUsed = userProfile?.listings_used_this_cycle || 0;
  const listingsPercentage = (listingsUsed / currentLimits.listings) * 100;

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
          {subscriptionStatus?.subscribed ? (
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

      {/* Add-ons & Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add-ons & Usage
          </CardTitle>
          <CardDescription>
            Manage your usage limits and purchase additional capacity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Usage */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Listings Used This Cycle</span>
                <span>{listingsUsed} / {currentLimits.listings === 999999 ? '∞' : currentLimits.listings}</span>
              </div>
              <Progress value={Math.min(listingsPercentage, 100)} className="h-2" />
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Marketplace Connections</span>
              <span>0 / {currentLimits.marketplaces}</span>
            </div>
          </div>

          <Separator />

          {/* Purchase Add-ons */}
          <div className="space-y-4">
            <h4 className="font-medium">Purchase Add-ons</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <h5 className="font-medium">Extra Listings</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add 100 additional listings to your current cycle
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatAmount(19.99)}</span>
                  <Button 
                    size="sm" 
                    onClick={() => handlePurchaseAddon('extra_listings', 100, 19.99)}
                  >
                    Purchase
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <h5 className="font-medium">Extra Marketplace</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect one additional marketplace for this cycle
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatAmount(9.99)}</span>
                  <Button 
                    size="sm"
                    onClick={() => handlePurchaseAddon('extra_marketplace', 1, 9.99)}
                  >
                    Purchase
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Add-ons */}
          {userAddons.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Active Add-ons</h4>
                <div className="space-y-2">
                  {userAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">
                          {addon.addon_type === 'extra_listings' ? 'Extra Listings' : 'Extra Marketplace'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          +{addon.addon_value} {addon.addon_type === 'extra_listings' ? 'listings' : 'marketplace'} 
                          • Expires {new Date(addon.billing_cycle_end).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">{formatAmount(addon.price_paid)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reports & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            View your financial performance and generate reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-sm text-muted-foreground">This Month Revenue</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-sm text-muted-foreground">This Month Profit</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Items Sold</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate P&L Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tax Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Documents
          </CardTitle>
          <CardDescription>
            Export your transaction data for tax preparation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Generate tax-ready exports of your sales data, expenses, and 1099 information.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={exportTaxDocuments} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export 2024 Tax Data
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download 1099s
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View your payment history and download receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No billing history available</p>
            <p className="text-sm">Payment history will appear here after your first transaction</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserBillingFinanceTab;