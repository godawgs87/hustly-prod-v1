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
    description: 'Perfect for getting started with reselling',
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
      { name: '100 listings per month', included: true },
      { name: '2 marketplace connections', included: true },
      { name: '500 photo analyses', included: true },
      { name: 'Basic listing templates', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Bulk operations', included: false },
      { name: 'Advanced automation', included: false },
      { name: 'Custom integrations', included: false }
    ]
  },
  {
    id: 'serious_seller',
    name: 'Serious Seller',
    description: 'For growing your reselling business',
    price: 49,
    billingPeriod: 'month',
    popular: true,
    badge: 'Most Popular',
    icon: <TrendingUp className="h-5 w-5" />,
    limits: {
      listings: 300,
      marketplaces: 4,
      photos: 1500,
      aiAnalysis: 500
    },
    features: [
      { name: '300 listings per month', included: true },
      { name: '4 marketplace connections', included: true },
      { name: '1,500 photo analyses', included: true },
      { name: 'Advanced listing templates', included: true },
      { name: 'Advanced analytics & reporting', included: true },
      { name: 'Priority email support', included: true },
      { name: 'Bulk operations', included: true },
      { name: 'Basic automation rules', included: true },
      { name: 'Custom integrations', included: false }
    ]
  },
  {
    id: 'full_time_flipper',
    name: 'Full-Time Flipper',
    description: 'Unlimited everything for serious businesses',
    price: 99,
    billingPeriod: 'month',
    badge: 'Best Value',
    icon: <Crown className="h-5 w-5" />,
    limits: {
      listings: 'unlimited',
      marketplaces: 'unlimited',
      photos: 'unlimited',
      aiAnalysis: 'unlimited'
    },
    features: [
      { name: 'Unlimited listings', included: true },
      { name: 'Unlimited marketplace connections', included: true },
      { name: 'Unlimited photo analyses', included: true },
      { name: 'Premium listing templates', included: true },
      { name: 'Enterprise analytics & reporting', included: true },
      { name: 'Priority phone & email support', included: true },
      { name: 'Advanced bulk operations', included: true },
      { name: 'Advanced automation rules', included: true },
      { name: 'Custom integrations & API access', included: true }
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