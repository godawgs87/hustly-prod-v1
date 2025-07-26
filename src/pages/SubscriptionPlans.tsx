import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, Zap, TrendingUp, ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'month' | 'year';
  popular?: boolean;
  features: PlanFeature[];
  badge?: string;
  icon?: React.ReactNode;
  limits: {
    listings: number | 'unlimited';
    marketplaces: number | 'unlimited';
    photos: number | 'unlimited';
    aiAnalysis: number | 'unlimited';
  };
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'side_hustler',
    name: 'Side Hustler',
    description: 'For new resellers testing the platform',
    price: 19,
    billingPeriod: 'month',
    icon: <Zap className="h-5 w-5" />,
    limits: {
      listings: 100,
      marketplaces: 2,
      photos: 500,
      aiAnalysis: 100
    },
    features: [
      { name: '100 listings with AI analysis per month', included: true },
      { name: '2 marketplace connections', included: true },
      { name: 'Basic inventory management', included: true },
      { name: 'Standard email support', included: true },
      { name: 'AI analysis with every listing', included: true },
      { name: 'Mobile access (PWA)', included: true },
      { name: 'Full inventory tools', included: true }
    ]
  },
  {
    id: 'serious_seller',
    name: 'Serious Seller',
    description: 'Save $240/year vs competitors',
    price: 49,
    billingPeriod: 'month',
    popular: true,
    badge: '⭐ Most Popular',
    icon: <TrendingUp className="h-5 w-5" />,
    limits: {
      listings: 300,
      marketplaces: 4,
      photos: 1500,
      aiAnalysis: 300
    },
    features: [
      { name: '300 listings with AI analysis per month', included: true },
      { name: '4 marketplace integrations (eBay, Poshmark, Mercari, Depop)', included: true },
      { name: 'Bulk upload and processing', included: true },
      { name: 'Profit tracking & sales analytics', included: true },
      { name: 'Priority support with live chat', included: true },
      { name: 'AI analysis with every listing', included: true },
      { name: 'Mobile access (PWA)', included: true },
      { name: 'Full inventory tools', included: true }
    ]
  },
  {
    id: 'full_time_flipper',
    name: 'Full-Time Flipper',
    description: 'Advanced tools for power sellers and teams',
    price: 89,
    billingPeriod: 'month',
    badge: '🏆 Best Value',
    icon: <Crown className="h-5 w-5" />,
    limits: {
      listings: 'unlimited',
      marketplaces: 'unlimited',
      photos: 'unlimited',
      aiAnalysis: 'unlimited'
    },
    features: [
      { name: 'Unlimited listings with AI analysis', included: true },
      { name: 'All current + future marketplace integrations', included: true },
      { name: 'Team collaboration features', included: true },
      { name: 'API access and webhooks', included: true },
      { name: 'Dedicated customer success manager', included: true },
      { name: 'AI analysis with every listing', included: true },
      { name: 'Mobile access (PWA)', included: true },
      { name: 'Full inventory tools', included: true }
    ]
  }
];

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscriptionStatus, createCheckout, checking, creating } = useSubscriptionManagement();
  const { currentTier } = useFeatureAccess();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    await createCheckout(planId as 'starter' | 'professional' | 'enterprise');
  };

  const getCurrentPlanBadge = (planId: string) => {
    if (currentTier === planId) {
      return <Badge variant="secondary" className="ml-2">Current Plan</Badge>;
    }
    return null;
  };

  const formatLimit = (limit: number | 'unlimited') => {
    return limit === 'unlimited' ? '∞' : limit.toLocaleString();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6 self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your reselling business with the right features and limits for your needs
          </p>
          
          {subscriptionStatus?.subscribed && (
            <div className="mt-6">
              <Badge variant="default" className="text-sm px-4 py-2">
                Currently on {subscriptionStatus.subscription_tier} plan
              </Badge>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {subscriptionPlans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-lg",
                plan.popular && "ring-2 ring-primary shadow-xl scale-105",
                currentTier === plan.id && "ring-2 ring-green-500"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.icon}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {getCurrentPlanBadge(plan.id)}
                </div>
                
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.billingPeriod}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key Limits */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Key Limits
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Listings</span>
                      <div className="font-semibold">{formatLimit(plan.limits.listings)}/mo</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Marketplaces</span>
                      <div className="font-semibold">{formatLimit(plan.limits.marketplaces)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Photos</span>
                      <div className="font-semibold">{formatLimit(plan.limits.photos)}/mo</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AI Analysis</span>
                      <div className="font-semibold">{formatLimit(plan.limits.aiAnalysis)}/mo</div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Features
                  </h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check 
                        className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          feature.included 
                            ? "text-green-500" 
                            : "text-muted-foreground opacity-50"
                        )}
                      />
                      <span 
                        className={cn(
                          "text-sm",
                          !feature.included && "text-muted-foreground opacity-75"
                        )}
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* CTA Button */}
                <Button
                  className={cn(
                    "w-full py-6 text-base font-medium",
                    currentTier === plan.id && "opacity-75"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={creating || checking || currentTier === plan.id}
                >
                  {creating && selectedPlan === plan.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Checkout...
                    </div>
                  ) : currentTier === plan.id ? (
                    'Current Plan'
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add-ons Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Boost your plan without upgrading</h2>
            <p className="text-muted-foreground">Add extra capacity to your current plan as needed</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Extra Listings
                </CardTitle>
                <CardDescription>
                  Add 25 additional listings for the current billing cycle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">$5.00</div>
                  <Button variant="outline">Purchase</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Extra Marketplace
                </CardTitle>
                <CardDescription>
                  Connect to more marketplaces – $10.00 per marketplace per month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">$10.00<span className="text-sm text-muted-foreground">/mo</span></div>
                  <Button variant="outline">Purchase</Button>
                </div>
              </CardContent>
            </Card>

            {/* Only show Bulk Upload add-on for Side Hustler users - higher tiers include it */}
            {currentTier === 'side_hustler' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-500" />
                    Bulk Upload
                  </CardTitle>
                  <CardDescription>
                    Upload and process multiple items at once with advanced batch tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">$15.00<span className="text-sm text-muted-foreground">/mo</span></div>
                    <Button variant="outline">Purchase</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-500" />
                    Bulk Upload
                  </CardTitle>
                  <CardDescription>
                    Upload and process multiple items at once with advanced batch tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Included in your plan</div>
                    <Badge variant="secondary">Included</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* All Plans Include Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                All Plans Include
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Zap className="h-6 w-6 text-blue-500" />
                  <span className="font-medium">AI analysis with every listing</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span className="font-medium">Mobile access (PWA)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Crown className="h-6 w-6 text-purple-500" />
                  <span className="font-medium">Full inventory tools</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Can I change plans anytime?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and you'll be prorated for any differences.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold">What happens if I exceed my limits?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You can purchase add-ons for extra capacity, or upgrade to a higher plan. 
                  We'll notify you before you reach your limits.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Is there a free trial?</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  All new accounts start with a 14-day free trial of the Serious Seller plan. 
                  No credit card required to get started.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;