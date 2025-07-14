import React, { ReactNode } from 'react';
import { useFeatureAccess, FeatureGateProps } from '@/hooks/useFeatureAccess';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateComponentProps extends FeatureGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate: React.FC<FeatureGateComponentProps> = ({
  feature,
  currentUsage = 0,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  const { checkFeatureAccess } = useFeatureAccess();
  const access = checkFeatureAccess(feature, currentUsage);

  if (access.hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt && access.upgradeRequired) {
    return (
      <UpgradePrompt
        feature={feature}
        requiredTier={access.upgradeRequired}
        currentUsage={access.currentUsage}
        limit={access.limit}
      />
    );
  }

  return null;
};