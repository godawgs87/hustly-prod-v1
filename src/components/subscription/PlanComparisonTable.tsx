import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanFeature {
  name: string;
  description?: string;
  values: {
    side_hustler: string | boolean;
    serious_seller: string | boolean;
    full_time_flipper: string | boolean;
  };
}

const planFeatures: PlanFeature[] = [
  {
    name: 'Monthly Listings',
    values: {
      side_hustler: '100',
      serious_seller: '300',
      full_time_flipper: 'Unlimited'
    }
  },
  {
    name: 'Marketplace Connections',
    values: {
      side_hustler: '2',
      serious_seller: '4',
      full_time_flipper: 'Unlimited'
    }
  },
  {
    name: 'Photo Analysis (Monthly)',
    values: {
      side_hustler: '500',
      serious_seller: '1,500',
      full_time_flipper: 'Unlimited'
    }
  },
  {
    name: 'Listing Templates',
    values: {
      side_hustler: 'Basic',
      serious_seller: 'Advanced',
      full_time_flipper: 'Premium'
    }
  },
  {
    name: 'Analytics & Reporting',
    values: {
      side_hustler: 'Basic',
      serious_seller: 'Advanced',
      full_time_flipper: 'Enterprise'
    }
  },
  {
    name: 'Support',
    values: {
      side_hustler: 'Email',
      serious_seller: 'Priority Email',
      full_time_flipper: 'Phone & Email'
    }
  },
  {
    name: 'Bulk Operations',
    values: {
      side_hustler: false,
      serious_seller: true,
      full_time_flipper: true
    }
  },
  {
    name: 'Automation Rules',
    values: {
      side_hustler: false,
      serious_seller: 'Basic',
      full_time_flipper: 'Advanced'
    }
  },
  {
    name: 'API Access',
    values: {
      side_hustler: false,
      serious_seller: false,
      full_time_flipper: true
    }
  },
  {
    name: 'Custom Integrations',
    values: {
      side_hustler: false,
      serious_seller: false,
      full_time_flipper: true
    }
  }
];

const plans = [
  {
    id: 'side_hustler',
    name: 'Side Hustler',
    price: 19,
    description: 'Perfect for getting started',
    icon: <Zap className="h-5 w-5" />,
    color: 'blue'
  },
  {
    id: 'serious_seller',
    name: 'Serious Seller',
    price: 49,
    description: 'For growing businesses',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'green',
    popular: true
  },
  {
    id: 'full_time_flipper',
    name: 'Full-Time Flipper',
    price: 99,
    description: 'Everything unlimited',
    icon: <Crown className="h-5 w-5" />,
    color: 'purple'
  }
];

interface PlanComparisonTableProps {
  onSelectPlan?: (planId: string) => void;
  compact?: boolean;
}

const PlanComparisonTable = ({ onSelectPlan, compact = false }: PlanComparisonTableProps) => {
  const { currentTier } = useFeatureAccess();
  const { createCheckout, creating } = useSubscriptionManagement();

  const handleSelectPlan = async (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      await createCheckout(planId as 'starter' | 'professional' | 'enterprise');
    }
  };

  const renderFeatureValue = (value: string | boolean, planId: string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-4 w-4 text-green-500 mx-auto" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  const getPlanColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'border-blue-200 bg-blue-50/50';
      case 'green':
        return 'border-green-200 bg-green-50/50';
      case 'purple':
        return 'border-purple-200 bg-purple-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              "relative transition-all duration-200",
              currentTier === plan.id && "ring-2 ring-primary",
              plan.popular && "ring-2 ring-green-500 scale-105"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-500 text-white px-3 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {plan.icon}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </div>
              <div className="text-2xl font-bold">${plan.price}/mo</div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            
            <CardContent>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={creating || currentTier === plan.id}
              >
                {currentTier === plan.id ? 'Current Plan' : `Choose ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-4 px-2 font-medium text-muted-foreground">
                  Features
                </th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center py-4 px-4 min-w-[180px]">
                    <div className={cn(
                      "rounded-lg p-4 border-2",
                      getPlanColorClasses(plan.color),
                      currentTier === plan.id && "ring-2 ring-primary",
                      plan.popular && "ring-2 ring-green-500"
                    )}>
                      {plan.popular && (
                        <Badge className="mb-2 bg-green-500 text-white">
                          Most Popular
                        </Badge>
                      )}
                      
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {plan.icon}
                        <span className="font-semibold">{plan.name}</span>
                      </div>
                      
                      <div className="text-2xl font-bold mb-1">
                        ${plan.price}/mo
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {plan.description}
                      </p>
                      
                      <Button
                        size="sm"
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={creating || currentTier === plan.id}
                      >
                        {currentTier === plan.id ? 'Current' : 'Choose'}
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {planFeatures.map((feature, index) => (
                <tr key={index} className="border-t">
                  <td className="py-3 px-2 font-medium">
                    {feature.name}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.values[plan.id as keyof typeof feature.values], plan.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanComparisonTable;