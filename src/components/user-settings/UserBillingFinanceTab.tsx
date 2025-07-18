import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import MarketplaceSelection from '@/components/addons/MarketplaceSelection';
import SubscriptionStatusCard from '@/components/subscription/SubscriptionStatusCard';
import PlanComparisonTable from '@/components/subscription/PlanComparisonTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, ShoppingCart, FileText, Download, Calendar, TrendingUp, Package, Receipt, Crown } from 'lucide-react';

const UserBillingFinanceTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscriptionStatus, checking: subscriptionLoading } = useSubscriptionManagement();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userAddons, setUserAddons] = useState<any[]>([]);
  const [showMarketplaceSelection, setShowMarketplaceSelection] = useState(false);
  const [showPlanComparison, setShowPlanComparison] = useState(false);

  useEffect(() => {
    if (user) {
      loadBillingData();
      handlePostPurchaseFlow();
    }
  }, [user]);

  const handlePostPurchaseFlow = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const addonSuccess = urlParams.get('addon_success');
    const addonCancel = urlParams.get('addon_cancel');

    if (addonSuccess) {
      toast({
        title: "Purchase Successful!",
        description: `Successfully purchased ${addonSuccess.replace('_', ' ')}.`,
      });
      
      // For marketplace purchases, show connection guidance
      if (addonSuccess === 'extra_marketplace') {
        setTimeout(() => {
          toast({
            title: "Next Step",
            description: "Visit the Connections tab to set up your new marketplace integration.",
            duration: 5000,
          });
        }, 2000);
      }
      
      // Clean up URL parameters
      const newUrl = window.location.pathname + '?tab=billing';
      window.history.replaceState({}, '', newUrl);
      
      // Refresh billing data to show new add-on
      loadBillingData();
    }
    
    if (addonCancel) {
      toast({
        title: "Purchase Cancelled",
        description: "Your add-on purchase was cancelled.",
        variant: "destructive"
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname + '?tab=billing';
      window.history.replaceState({}, '', newUrl);
    }
  };

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Load user profile for usage data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase add-ons.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('addon-management', {
        body: {
          action: 'create_checkout',
          addon_type: addonType,
          addon_value: addonValue,
          price: price
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout creation failed:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || 'Failed to create checkout session',
        variant: "destructive"
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
      'side_hustler': { listings: 100, marketplaces: 2 },
      'serious_seller': { listings: 300, marketplaces: 4 },
      'full_time_flipper': { listings: -1, marketplaces: -1 },
      'founders': { listings: 300, marketplaces: 4 }
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

  const currentTier = subscriptionStatus?.subscription_tier || userProfile?.subscription_tier || 'trial';
  const currentLimits = getUsageLimits(currentTier);
  const listingsUsed = userProfile?.listings_used_this_cycle || 0;
  const listingsPercentage = currentLimits.listings === -1 ? 0 : (listingsUsed / currentLimits.listings) * 100;

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <SubscriptionStatusCard 
        onUpgradeClick={() => navigate('/plans')}
        onManageClick={() => setShowPlanComparison(!showPlanComparison)}
      />

      {/* Plan Comparison Toggle */}
      {showPlanComparison && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Available Plans
            </h3>
            <Button 
              variant="outline" 
              onClick={() => navigate('/plans')}
            >
              View Full Plans Page
            </Button>
          </div>
          <PlanComparisonTable 
            compact={true}
            onSelectPlan={() => navigate('/plans')}
          />
        </div>
      )}

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
                <span>{listingsUsed} / {currentLimits.listings === -1 ? '∞' : currentLimits.listings}</span>
              </div>
              {currentLimits.listings !== -1 && (
                <Progress value={Math.min(listingsPercentage, 100)} className="h-2" />
              )}
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Photos Analyzed This Month</span>
                <span>{userProfile?.photos_used_this_month || 0} / {userProfile?.monthly_photo_limit || 50}</span>
              </div>
              {(userProfile?.monthly_photo_limit || 50) !== -1 && (
                <Progress 
                  value={Math.min(((userProfile?.photos_used_this_month || 0) / (userProfile?.monthly_photo_limit || 50)) * 100, 100)} 
                  className="h-2" 
                />
              )}
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Marketplace Connections</span>
              <span>1 / {currentLimits.marketplaces === -1 ? '∞' : currentLimits.marketplaces}</span>
            </div>
          </div>

          <Separator />

          {/* Purchase Add-ons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Purchase Add-ons</h4>
              <p className="text-sm text-muted-foreground">
                Boost your current plan without upgrading
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-500" />
                  <h5 className="font-medium">Extra Listings</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add 25 additional listings to your current billing cycle
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{formatAmount(5.00)}</span>
                  <Button 
                    size="sm"
                    onClick={() => handlePurchaseAddon('extra_listings', 25, 5.00)}
                  >
                    Purchase
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                  <h5 className="font-medium">Extra Marketplace</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect to additional marketplaces - $10.00 each
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">From {formatAmount(10.00)}</span>
                  <Button 
                    size="sm"
                    onClick={() => setShowMarketplaceSelection(true)}
                  >
                    Purchase
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-medium text-blue-900 mb-1">Need more capacity?</h5>
                  <p className="text-sm text-blue-700">
                    Consider upgrading to a higher plan for better value and more features.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => navigate('/plans')}
                  >
                    View Plans
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

      {/* Marketplace Selection Modal */}
      {showMarketplaceSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MarketplaceSelection
            userTier={subscriptionStatus?.subscription_tier || 'trial'}
            currentMarketplaces={['ebay']} // TODO: Get from user marketplace connections
            onClose={() => setShowMarketplaceSelection(false)}
            onSuccess={() => loadBillingData()}
          />
        </div>
      )}
    </div>
  );
};

export default UserBillingFinanceTab;