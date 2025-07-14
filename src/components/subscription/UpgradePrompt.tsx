import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, TrendingUp, Zap, Users } from 'lucide-react';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { TIER_LIMITS, SUBSCRIPTION_TIERS } from '@/utils/constants';

interface UpgradePromptProps {
  feature: string;
  requiredTier: string;
  currentUsage?: number;
  limit?: number;
  className?: string;
}

const featureIcons = {
  bulk_upload: TrendingUp,
  advanced_analytics: Zap,
  team_collaboration: Users,
  api_access: Users,
  marketplace_connection: TrendingUp,
  listing_creation: TrendingUp,
  photo_analysis: Zap
};

const featureNames = {
  bulk_upload: 'Bulk Upload',
  advanced_analytics: 'Advanced Analytics',
  team_collaboration: 'Team Collaboration',
  api_access: 'API Access',
  marketplace_connection: 'Marketplace Connections',
  listing_creation: 'Listing Creation',
  photo_analysis: 'AI Photo Analysis'
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  requiredTier,
  currentUsage,
  limit,
  className
}) => {
  const { createCheckout, creating } = useSubscriptionManagement();
  const Icon = featureIcons[feature as keyof typeof featureIcons] || Lock;
  const featureName = featureNames[feature as keyof typeof featureNames] || 'Feature';
  const tierInfo = TIER_LIMITS[requiredTier as keyof typeof TIER_LIMITS];

  const handleUpgrade = async () => {
    if (requiredTier === SUBSCRIPTION_TIERS.FOUNDERS) {
      await createCheckout('founders' as any);
    } else if (requiredTier === SUBSCRIPTION_TIERS.SIDE_HUSTLER) {
      await createCheckout('starter');
    } else if (requiredTier === SUBSCRIPTION_TIERS.SERIOUS_SELLER) {
      await createCheckout('professional');
    } else if (requiredTier === SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER) {
      await createCheckout('enterprise');
    }
  };

  const getUpgradeMessage = () => {
    if (currentUsage !== undefined && limit !== undefined && limit !== -1) {
      return `You've reached your limit of ${limit} ${featureName.toLowerCase()} per month. Upgrade to ${tierInfo?.name} for ${limit === -1 ? 'unlimited' : 'more'} access.`;
    }
    return `${featureName} is available with ${tierInfo?.name} plan and higher.`;
  };

  return (
    <Card className={`border-border/50 bg-card/50 ${className}`}>
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-lg">
            Upgrade Required
          </CardTitle>
          <CardDescription className="text-sm">
            {getUpgradeMessage()}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {tierInfo?.name} Plan - ${tierInfo?.price}/mo
          </Badge>
          {requiredTier === SUBSCRIPTION_TIERS.FOUNDERS && (
            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-700 dark:text-orange-300">
              🔥 Limited Time
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={handleUpgrade}
          disabled={creating}
          className="w-full"
        >
          {creating ? 'Opening Checkout...' : `Upgrade to ${tierInfo?.name}`}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Upgrade now to unlock {featureName.toLowerCase()} and other premium features
        </p>
      </CardContent>
    </Card>
  );
};