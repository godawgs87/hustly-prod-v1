
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Download, Calendar, ExternalLink } from 'lucide-react';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';

const UserBillingTab = () => {
  const { subscriptionStatus, createCheckout, openCustomerPortal, checking, creating } = useSubscriptionManagement();
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
              <p className="text-sm text-gray-600">Manage your subscription</p>
            </div>
            <Badge className={subscriptionStatus?.subscribed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {planName}
            </Badge>
          </div>

          {subscriptionStatus?.subscribed ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-lg font-semibold text-green-600">Active Subscription</p>
                  <p className="text-sm text-gray-600">
                    {subscriptionStatus.subscription_end 
                      ? `Renews ${new Date(subscriptionStatus.subscription_end).toLocaleDateString()}`
                      : 'Subscription active'
                    }
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-lg font-semibold">Unlimited</p>
                  <p className="text-sm text-gray-600">Monthly listings</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleManageSubscription}
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Manage Subscription</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-sm text-gray-600">per month</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">10</p>
                  <p className="text-sm text-gray-600">monthly limit</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">Basic</p>
                  <p className="text-sm text-gray-600">features</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h5 className="font-medium text-blue-900 mb-2">Upgrade to unlock more features:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Unlimited listings</li>
                  <li>• Multiple marketplace integrations</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleUpgrade('starter')}
                  disabled={creating}
                  variant="outline"
                >
                  {creating ? 'Processing...' : 'Side Hustler - $19/mo'}
                </Button>
                <Button 
                  onClick={() => handleUpgrade('professional')}
                  disabled={creating}
                >
                  {creating ? 'Processing...' : 'Serious Seller - $49/mo'}
                </Button>
                <Button 
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={creating}
                  variant="outline"
                >
                  {creating ? 'Processing...' : 'Full-Time Flipper - $89/mo'}
                </Button>
              </div>
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
