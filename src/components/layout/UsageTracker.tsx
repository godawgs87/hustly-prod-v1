import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';

interface UsageTrackerProps {
  sticky?: boolean;
  compact?: boolean;
  className?: string;
}

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  sticky = false,
  compact = false,
  className = ''
}) => {
  const { checkFeatureAccess, getBillingCycleInfo, tierLimits, currentTier, isAdminOrTester } = useFeatureAccess();
  const { createCheckout } = useSubscriptionManagement();
  
  const billingInfo = getBillingCycleInfo();
  const listingAccess = checkFeatureAccess('listing_creation', billingInfo.listingsUsed);
  
  const usagePercentage = listingAccess.limit === -1 
    ? 0 
    : Math.min(100, (billingInfo.listingsUsed / listingAccess.limit) * 100);
  
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = listingAccess.isAtLimit;
  const isUnlimited = listingAccess.limit === -1;

  const handleUpgrade = async () => {
    if (currentTier === 'free' || currentTier === 'side_hustler') {
      await createCheckout('professional');
    } else {
      await createCheckout('enterprise');
    }
  };

  // Don't show for unlimited plans unless near cycle end or admin with actual data
  if (isUnlimited && billingInfo.daysLeft > 7 && !isAdminOrTester()) {
    return null;
  }

  // Don't show if usage is low and not approaching limits
  if (!isAtLimit && !isNearLimit && usagePercentage < 50 && billingInfo.daysLeft > 14) {
    return null;
  }

  const getStatusIcon = () => {
    if (isUnlimited) return <CheckCircle className="h-4 w-4 text-primary" />;
    if (isAtLimit) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (isNearLimit) return <TrendingUp className="h-4 w-4 text-warning" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (isAtLimit) return 'border-l-destructive bg-destructive/5';
    if (isNearLimit) return 'border-l-warning bg-warning/5';
    return 'border-l-primary bg-primary/5';
  };

  const getMessage = () => {
    if (isAtLimit) {
      return {
        title: 'Listing limit reached',
        description: `You've created ${billingInfo.listingsUsed} listings this cycle. Upgrade to continue.`
      };
    }
    if (isNearLimit) {
      return {
        title: 'Approaching limit',
        description: `${Math.round(100 - usagePercentage)}% of your listing allowance remaining.`
      };
    }
    return {
      title: 'Track your progress',
      description: `${billingInfo.listingsUsed} listings created this cycle.`
    };
  };

  const message = getMessage();

  return (
    <Card className={`
      ${sticky ? 'sticky top-4 z-10' : ''} 
      border-l-4 ${getStatusColor()} 
      ${compact ? 'p-3' : 'p-4'} 
      ${className}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="min-w-0 flex-1">
            <h4 className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
              {message.title}
            </h4>
            <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
              {message.description}
            </p>
            {!compact && (
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                <span>
                  {isUnlimited 
                    ? `${billingInfo.listingsUsed} listings (unlimited)`
                    : `${billingInfo.listingsUsed}/${listingAccess.limit} listings`
                  }
                </span>
                <span>•</span>
                <span>{billingInfo.daysLeft} days left</span>
                <span>•</span>
                <span className="font-medium">{tierLimits.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isUnlimited && (
            <div className={compact ? 'w-16' : 'w-24'}>
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${
                  isAtLimit 
                    ? '[&>div]:bg-destructive' 
                    : isNearLimit 
                    ? '[&>div]:bg-warning' 
                    : '[&>div]:bg-primary'
                }`}
              />
              <p className="text-xs text-muted-foreground text-center mt-1">
                {Math.round(usagePercentage)}%
              </p>
            </div>
          )}
          
          {(isAtLimit || (isNearLimit && !isUnlimited)) && (
            <Button 
              size={compact ? "sm" : "default"}
              variant={isAtLimit ? "default" : "outline"}
              onClick={handleUpgrade}
              className="flex items-center space-x-1"
            >
              <Zap className="h-3 w-3" />
              <span>{isAtLimit ? 'Upgrade' : 'Upgrade'}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};