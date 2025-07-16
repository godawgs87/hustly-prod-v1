import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface UsageIndicatorProps {
  feature: 'marketplace_connection' | 'listing_creation' | 'photo_analysis';
  currentUsage: number;
  label?: string;
  showUpgradeHint?: boolean;
  className?: string;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  feature,
  currentUsage,
  label,
  showUpgradeHint = true,
  className
}) => {
  const { checkFeatureAccess } = useFeatureAccess();
  const access = checkFeatureAccess(feature, currentUsage);

  const getProgressValue = () => {
    if (access.limit === -1) return 0; // Unlimited
    return (access.currentUsage / access.limit) * 100;
  };

  const getUsageText = () => {
    if (access.limit === -1) {
      return `${access.currentUsage} (unlimited)`;
    }
    return `${access.currentUsage} / ${access.limit}`;
  };

  const getIcon = () => {
    const percentage = getProgressValue();
    if (access.limit === -1) return <CheckCircle className="h-4 w-4 text-primary" />;
    if (percentage >= 100) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (percentage >= 80) return <TrendingUp className="h-4 w-4 text-warning" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getProgressColor = () => {
    const percentage = getProgressValue();
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-muted-foreground">
            {label || `${feature.replace('_', ' ')} usage`}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-medium">{getUsageText()}</span>
          {access.isAtLimit && (
            <Badge variant="destructive" className="text-xs">
              Limit Reached
            </Badge>
          )}
        </div>
      </div>
      
      {access.limit !== -1 && (
        <div className="space-y-1">
          <Progress 
            value={getProgressValue()} 
            className="h-2"
          />
          {access.isAtLimit && showUpgradeHint && access.upgradeRequired && (
            <p className="text-xs text-muted-foreground">
              Upgrade to {access.upgradeRequired.replace('_', ' ')} for more access
            </p>
          )}
        </div>
      )}
    </div>
  );
};