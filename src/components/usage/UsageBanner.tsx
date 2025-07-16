import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';

export const UsageBanner: React.FC = () => {
  const { checkFeatureAccess, getBillingCycleInfo, tierLimits, currentTier } = useFeatureAccess();
  const { createCheckout } = useSubscriptionManagement();
  
  const billingInfo = getBillingCycleInfo();
  const listingAccess = checkFeatureAccess('listing_creation', billingInfo.listingsUsed);
  
  const usagePercentage = listingAccess.limit === -1 
    ? 0 
    : Math.min(100, (billingInfo.listingsUsed / listingAccess.limit) * 100);
  
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = listingAccess.isAtLimit;

  const handleUpgrade = async () => {
    if (currentTier === 'free' || currentTier === 'side_hustler') {
      await createCheckout('professional');
    } else {
      await createCheckout('enterprise');
    }
  };

  // Don't show banner for unlimited plans unless they're approaching billing cycle end
  if (listingAccess.limit === -1 && billingInfo.daysLeft > 7) {
    return null;
  }

  return (
    <Card className={`p-4 mb-6 border-l-4 ${
      isAtLimit 
        ? 'border-l-destructive bg-destructive/5' 
        : isNearLimit 
        ? 'border-l-warning bg-warning/5' 
        : 'border-l-primary bg-primary/5'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isAtLimit ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : isNearLimit ? (
              <TrendingUp className="h-5 w-5 text-warning" />
            ) : (
              <Clock className="h-5 w-5 text-primary" />
            )}
            <div>
              <h3 className="font-semibold text-sm">
                {tierLimits.name} Plan Usage
              </h3>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>
                  {listingAccess.limit === -1 
                    ? `${billingInfo.listingsUsed} listings this cycle`
                    : `${billingInfo.listingsUsed}/${listingAccess.limit} listings`
                  }
                </span>
                <span>•</span>
                <span>{billingInfo.daysLeft} days left in cycle</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {listingAccess.limit !== -1 && (
            <div className="w-32">
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
          
          {(isAtLimit || isNearLimit) && (
            <Button 
              size="sm" 
              variant={isAtLimit ? "default" : "outline"}
              onClick={handleUpgrade}
            >
              {isAtLimit ? 'Upgrade Now' : 'Upgrade Plan'}
            </Button>
          )}
        </div>
      </div>

      {isAtLimit && (
        <div className="mt-3 p-3 bg-destructive/10 rounded-md">
          <p className="text-sm text-destructive">
            <strong>Listing limit reached!</strong> You've used all {listingAccess.limit} listings for this billing cycle. 
            Upgrade to continue creating listings or purchase additional listing packs.
          </p>
        </div>
      )}
    </Card>
  );
};