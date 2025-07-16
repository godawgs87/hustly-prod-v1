
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Download, Calendar, ExternalLink } from 'lucide-react';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { TIER_LIMITS, SUBSCRIPTION_TIERS } from '@/utils/constants';
import { AddonPurchase } from '@/components/addons/AddonPurchase';

const UserBillingTab = () => {
  const { subscriptionStatus, createCheckout, openCustomerPortal, checking, creating } = useSubscriptionManagement();
  const { currentTier, tierLimits, isAdminOrTester } = useFeatureAccess();
  const [planName, setPlanName] = useState('Free Plan');

  useEffect(() => {
    if (subscriptionStatus?.subscribed) {
      setPlanName(subscriptionStatus.subscription_tier || 'Unknown Plan');
    }
  }, [subscriptionStatus]);

  const handleUpgrade = async (plan: 'starter' | 'professional' | 'enterprise') => {
    await createCheckout(plan);
  };

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CreditCard className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Subscription & Billing</h3>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium">Current Plan</h4>
              <p className="text-sm text-gray-600">
                {tierLimits.listings_per_month === -1 ? 'Unlimited listings with AI analysis' : 
                 `${tierLimits.listings_per_month} listings with AI analysis per month`}
              </p>
              {isAdminOrTester() && (
                <p className="text-xs text-blue-600 font-medium">Admin/Tester Access - Unlimited Features</p>
              )}
            </div>
            <Badge className={subscriptionStatus?.subscribed || isAdminOrTester() ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {tierLimits.name}
            </Badge>
          </div>

          {subscriptionStatus?.subscribed || isAdminOrTester() ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-lg font-semibold text-green-600">
                    {isAdminOrTester() ? 'Admin/Tester Access' : 'Active Subscription'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isAdminOrTester() 
                      ? 'Unlimited access to all features'
                      : subscriptionStatus.subscription_end 
                        ? `Renews ${new Date(subscriptionStatus.subscription_end).toLocaleDateString()}`
                        : 'Subscription active'
                    }
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-lg font-semibold">
                    {tierLimits.listings_per_month === -1 ? 'Unlimited' : tierLimits.listings_per_month}
                  </p>
                  <p className="text-sm text-gray-600">Monthly listings with AI analysis</p>
                </div>
              </div>

              <div className="flex space-x-2">
                {!isAdminOrTester() && (
                  <Button 
                    onClick={handleManageSubscription}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Manage Subscription</span>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">${tierLimits.price}</p>
                  <p className="text-sm text-gray-600">per month</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">
                    {tierLimits.listings_per_month === -1 ? '∞' : tierLimits.listings_per_month}
                  </p>
                  <p className="text-sm text-gray-600">listings with AI analysis</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">
                    {tierLimits.marketplace_connections === -1 ? '∞' : tierLimits.marketplace_connections}
                  </p>
                  <p className="text-sm text-gray-600">marketplace connections</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h5 className="font-medium text-blue-900 mb-2">Current plan features:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  {tierLimits.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>

              {currentTier !== SUBSCRIPTION_TIERS.FOUNDERS && (
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h5 className="font-medium text-green-900 mb-2">Upgrade to unlock more features:</h5>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• More listings with AI analysis per month</li>
                    <li>• Additional marketplace integrations</li>
                    <li>• Advanced analytics and reporting</li>
                    <li>• Priority support</li>
                  </ul>
                </div>
              )}

              {currentTier !== SUBSCRIPTION_TIERS.FOUNDERS && (
                <div className="flex space-x-2 flex-wrap gap-2">
                  {Object.entries(TIER_LIMITS).map(([tier, limits]) => {
                    if (tier === SUBSCRIPTION_TIERS.FREE || tier === currentTier) return null;
                    
                    const tierDisplayName = tier === SUBSCRIPTION_TIERS.SIDE_HUSTLER ? 'Side Hustler' :
                                          tier === SUBSCRIPTION_TIERS.SERIOUS_SELLER ? 'Serious Seller' :
                                          tier === SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER ? 'Full-Time Flipper' : 
                                          'Premium';
                    
                    const planType = tier === SUBSCRIPTION_TIERS.SIDE_HUSTLER ? 'starter' :
                                   tier === SUBSCRIPTION_TIERS.SERIOUS_SELLER ? 'professional' :
                                   tier === SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER ? 'enterprise' : 'starter';
                    
                    return (
                      <Button 
                        key={tier}
                        onClick={() => handleUpgrade(planType as 'starter' | 'professional' | 'enterprise')}
                        disabled={creating}
                        variant={tier === SUBSCRIPTION_TIERS.SERIOUS_SELLER ? "default" : "outline"}
                      >
                        {creating ? 'Processing...' : `${tierDisplayName} - $${limits.price}/mo`}
                      </Button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-lg font-medium mb-3">Payment Method</h4>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-6 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold">
                ••••
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-600">Expires 12/26</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium">Billing History</h4>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>

          <div className="space-y-2">
            {[
              { date: 'Dec 1, 2024', amount: '$29.00', status: 'Paid', invoice: 'INV-001' },
              { date: 'Nov 1, 2024', amount: '$29.00', status: 'Paid', invoice: 'INV-002' },
              { date: 'Oct 1, 2024', amount: '$29.00', status: 'Paid', invoice: 'INV-003' },
            ].map((bill, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{bill.date}</p>
                    <p className="text-sm text-gray-600">{bill.invoice}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{bill.status}</Badge>
                  <p className="font-medium">{bill.amount}</p>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-lg font-medium mb-3">Add-on Purchases</h4>
          <p className="text-sm text-gray-600 mb-4">
            Boost your current plan with additional features and capacity
          </p>
          <AddonPurchase />
        </div>

        <Separator />

        <div>
          <h4 className="text-lg font-medium mb-3">Billing Address</h4>
          <div className="p-3 border rounded-lg">
            <p className="font-medium">John Doe</p>
            <p className="text-sm text-gray-600">123 Main Street</p>
            <p className="text-sm text-gray-600">Anytown, ST 12345</p>
            <p className="text-sm text-gray-600">United States</p>
          </div>
          <Button variant="outline" className="mt-2">Edit Address</Button>
        </div>
      </div>
    </Card>
  );
};

export default UserBillingTab;
