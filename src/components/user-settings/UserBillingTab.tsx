
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Download, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { TIER_LIMITS, SUBSCRIPTION_TIERS } from '@/utils/constants';
import { AddonPurchase } from '@/components/addons/AddonPurchase';

const UserBillingTab = () => {
  const { subscriptionStatus, createCheckout, openCustomerPortal, getPaymentMethods, getBillingHistory, checking, creating } = useSubscriptionManagement();
  const { currentTier, tierLimits, isAdminOrTester } = useFeatureAccess();
  const [planName, setPlanName] = useState('Free Plan');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (subscriptionStatus?.subscribed) {
      setPlanName(subscriptionStatus.subscription_tier || 'Unknown Plan');
    }
  }, [subscriptionStatus]);

  useEffect(() => {
    const loadPaymentData = async () => {
      if (subscriptionStatus?.subscribed && !isAdminOrTester()) {
        setLoadingPayment(true);
        setLoadingHistory(true);
        
        const [methods, history] = await Promise.all([
          getPaymentMethods(),
          getBillingHistory()
        ]);
        
        setPaymentMethods(methods);
        setBillingHistory(history);
        setLoadingPayment(false);
        setLoadingHistory(false);
      }
    };
    
    loadPaymentData();
  }, [subscriptionStatus, getPaymentMethods, getBillingHistory, isAdminOrTester]);

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
                    {tierLimits.listings_per_month === -1 ? '♾️' : tierLimits.listings_per_month}
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
                     {tierLimits.listings_per_month === -1 ? '♾️' : tierLimits.listings_per_month}
                   </p>
                   <p className="text-sm text-gray-600">listings with AI analysis</p>
                 </div>
                 <div className="p-4 border rounded-lg">
                   <p className="text-2xl font-bold">
                     {tierLimits.marketplace_connections === -1 ? '♾️' : tierLimits.marketplace_connections}
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
          {loadingPayment ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading payment methods...
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {paymentMethods.map((method, index) => (
                <div key={method.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold">
                      {method.brand?.toUpperCase() || '••••'}
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• {method.last4}</p>
                      <p className="text-sm text-gray-600">Expires {method.exp_month}/{method.exp_year}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                    Update
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 border rounded-lg text-center text-gray-500">
              {isAdminOrTester() ? 'Admin/Tester account' : 'No payment method on file'}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium">Billing History</h4>
            {billingHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading billing history...
            </div>
          ) : billingHistory.length > 0 ? (
            <div className="space-y-2">
              {billingHistory.map((invoice, index) => (
                <div key={invoice.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{new Date(invoice.created * 1000).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{invoice.number || `Invoice ${index + 1}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                    <p className="font-medium">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </p>
                    {invoice.invoice_pdf && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 border rounded-lg text-center text-gray-500">
              {isAdminOrTester() ? 'Admin/Tester account' : 'No billing history found'}
            </div>
          )}
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
          <div className="p-3 border rounded-lg text-center text-gray-500">
            {isAdminOrTester() ? 'Admin/Tester account' : 'Manage billing address through Stripe Customer Portal'}
          </div>
          {!isAdminOrTester() && (
            <Button variant="outline" className="mt-2" onClick={handleManageSubscription}>
              Manage Billing Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default UserBillingTab;
