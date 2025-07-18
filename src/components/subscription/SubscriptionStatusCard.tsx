import React from 'react';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Crown, TrendingUp, Zap, Settings, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionStatusCardProps {
  onManageClick?: () => void;
  onUpgradeClick?: () => void;
  compact?: boolean;
}

const SubscriptionStatusCard = ({ 
  onManageClick, 
  onUpgradeClick,
  compact = false 
}: SubscriptionStatusCardProps) => {
  const { subscriptionStatus, openCustomerPortal } = useSubscriptionManagement();
  const { currentTier, tierLimits, getBillingCycleInfo } = useFeatureAccess();
  
  const billingInfo = getBillingCycleInfo();
  const isActive = subscriptionStatus?.subscribed || currentTier !== 'free';

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'side_hustler':
        return <Zap className="h-4 w-4" />;
      case 'serious_seller':
        return <TrendingUp className="h-4 w-4" />;
      case 'full_time_flipper':
        return <Crown className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames: { [key: string]: string } = {
      'free': 'Free',
      'side_hustler': 'Side Hustler',
      'serious_seller': 'Serious Seller',
      'full_time_flipper': 'Full-Time Flipper',
      'founders': 'Founders'
    };
    return tierNames[tier] || tier;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'side_hustler':
        return 'bg-blue-100 text-blue-800';
      case 'serious_seller':
        return 'bg-green-100 text-green-800';
      case 'full_time_flipper':
        return 'bg-purple-100 text-purple-800';
      case 'founders':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const usagePercentage = tierLimits.listings_per_month === -1 
    ? 0 
    : Math.min(100, (billingInfo.listingsUsed / tierLimits.listings_per_month) * 100);

  const isNearLimit = usagePercentage > 80;
  const isAtLimit = usagePercentage >= 100;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {getTierIcon(currentTier)}
          <div>
            <div className="font-medium">{getTierDisplayName(currentTier)}</div>
            <div className="text-sm text-muted-foreground">
              {tierLimits.listings_per_month === -1 
                ? `${billingInfo.listingsUsed} listings used`
                : `${billingInfo.listingsUsed}/${tierLimits.listings_per_month} listings`
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isNearLimit || isAtLimit) && currentTier !== 'full_time_flipper' && (
            <Button size="sm" variant="outline" onClick={onUpgradeClick}>
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="ghost" onClick={onManageClick || openCustomerPortal}>
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      isAtLimit && "border-destructive bg-destructive/5",
      isNearLimit && !isAtLimit && "border-yellow-500 bg-yellow-50/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getTierIcon(currentTier)}
            Subscription Status
          </CardTitle>
          <Badge className={getTierColor(currentTier)}>
            {getTierDisplayName(currentTier)}
          </Badge>
        </div>
        <CardDescription>
          {isActive 
            ? `${billingInfo.daysLeft} days remaining in your billing cycle`
            : 'No active subscription'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Listings Used</span>
            <span className={cn(
              "font-medium",
              isAtLimit && "text-destructive",
              isNearLimit && "text-yellow-600"
            )}>
              {tierLimits.listings_per_month === -1 
                ? `${billingInfo.listingsUsed} (Unlimited)`
                : `${billingInfo.listingsUsed}/${tierLimits.listings_per_month}`
              }
            </span>
          </div>
          
          {tierLimits.listings_per_month !== -1 && (
            <Progress 
              value={usagePercentage} 
              className={cn(
                "h-2",
                isAtLimit && "bg-destructive/20",
                isNearLimit && "bg-yellow-100"
              )}
            />
          )}

          {isAtLimit && (
            <div className="text-sm text-destructive font-medium">
              You've reached your listing limit for this cycle
            </div>
          )}
          
          {isNearLimit && !isAtLimit && (
            <div className="text-sm text-yellow-600 font-medium">
              You're approaching your listing limit
            </div>
          )}
        </div>

        {/* Subscription Details */}
        {subscriptionStatus?.subscription_end && (
          <div className="text-sm text-muted-foreground">
            Next billing: {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isActive ? (
            <>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onManageClick || openCustomerPortal}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Plan
              </Button>
              
              {currentTier !== 'full_time_flipper' && (isNearLimit || isAtLimit) && (
                <Button 
                  className="flex-1"
                  onClick={onUpgradeClick}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              )}
            </>
          ) : (
            <Button 
              className="w-full"
              onClick={onUpgradeClick}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Choose a Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatusCard;