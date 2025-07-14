import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSubscriptionManagement } from './useSubscriptionManagement';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_FEATURES, TIER_LIMITS } from '@/utils/constants';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureAccess {
  hasAccess: boolean;
  isAtLimit: boolean;
  currentUsage: number;
  limit: number;
  upgradeRequired: string | null;
  tierName: string;
}

export interface FeatureGateProps {
  feature: string;
  currentUsage?: number;
}

export const useFeatureAccess = () => {
  const { subscriptionStatus } = useSubscriptionManagement();
  
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_role, subscription_tier, subscription_status')
        .eq('id', session.user.id)
        .maybeSingle();

      return profile;
    },
  });

  const isAdminOrTester = (): boolean => {
    return userProfile?.user_role === 'admin' || userProfile?.user_role === 'tester';
  };
  
  const currentTier = useMemo(() => {
    // Admin and testers get founders plan access
    if (isAdminOrTester()) {
      return SUBSCRIPTION_TIERS.FOUNDERS;
    }
    
    if (!subscriptionStatus?.subscription_tier) {
      return SUBSCRIPTION_TIERS.FREE;
    }
    return subscriptionStatus.subscription_tier as keyof typeof TIER_LIMITS;
  }, [subscriptionStatus, userProfile]);

  const tierLimits = useMemo(() => {
    return TIER_LIMITS[currentTier] || TIER_LIMITS[SUBSCRIPTION_TIERS.FREE];
  }, [currentTier]);

  const checkFeatureAccess = (feature: FeatureGateProps['feature'], currentUsage: number = 0): FeatureAccess => {
    // Admin and testers have unlimited access
    if (isAdminOrTester()) {
      return {
        hasAccess: true,
        isAtLimit: false,
        currentUsage,
        limit: -1,
        upgradeRequired: '',
        tierName: 'Admin/Tester Access'
      };
    }
    
    const limits = tierLimits;
    
    switch (feature) {
      case SUBSCRIPTION_FEATURES.BULK_UPLOAD:
        return {
          hasAccess: (limits.features as readonly string[]).includes('bulk_upload'),
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: (limits.features as readonly string[]).includes('bulk_upload') 
            ? null 
            : SUBSCRIPTION_TIERS.SERIOUS_SELLER,
          tierName: limits.name
        };

      case SUBSCRIPTION_FEATURES.ADVANCED_ANALYTICS:
        return {
          hasAccess: (limits.features as readonly string[]).includes('advanced_analytics'),
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: (limits.features as readonly string[]).includes('advanced_analytics') 
            ? null 
            : SUBSCRIPTION_TIERS.SERIOUS_SELLER,
          tierName: limits.name
        };

      case SUBSCRIPTION_FEATURES.TEAM_COLLABORATION:
        return {
          hasAccess: (limits.features as readonly string[]).includes('team_collaboration'),
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: (limits.features as readonly string[]).includes('team_collaboration') 
            ? null 
            : SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER,
          tierName: limits.name
        };

      case SUBSCRIPTION_FEATURES.API_ACCESS:
        return {
          hasAccess: (limits.features as readonly string[]).includes('api_access'),
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: (limits.features as readonly string[]).includes('api_access') 
            ? null 
            : SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER,
          tierName: limits.name
        };

      case 'marketplace_connection':
        const maxConnections = limits.marketplace_connections;
        const isAtLimit = maxConnections !== -1 && currentUsage >= maxConnections;
        return {
          hasAccess: !isAtLimit,
          isAtLimit,
          currentUsage,
          limit: maxConnections,
          upgradeRequired: isAtLimit ? getNextTierForConnections(currentUsage + 1) : null,
          tierName: limits.name
        };

      case 'listing_creation':
        const maxListings = limits.listings_per_month;
        const isAtListingLimit = maxListings !== -1 && currentUsage >= maxListings;
        return {
          hasAccess: !isAtListingLimit,
          isAtLimit: isAtListingLimit,
          currentUsage,
          limit: maxListings,
          upgradeRequired: isAtListingLimit ? getNextTierForListings(currentUsage + 1) : null,
          tierName: limits.name
        };

      case 'photo_analysis':
        const maxAnalyses = limits.photo_analyses_per_month;
        const isAtAnalysisLimit = maxAnalyses !== -1 && currentUsage >= maxAnalyses;
        return {
          hasAccess: !isAtAnalysisLimit,
          isAtLimit: isAtAnalysisLimit,
          currentUsage,
          limit: maxAnalyses,
          upgradeRequired: isAtAnalysisLimit ? getNextTierForPhotoAnalysis(currentUsage + 1) : null,
          tierName: limits.name
        };

      default:
        return {
          hasAccess: true,
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: null,
          tierName: limits.name
        };
    }
  };

  const getNextTierForConnections = (neededConnections: number): string => {
    if (neededConnections <= 2) return SUBSCRIPTION_TIERS.SIDE_HUSTLER;
    if (neededConnections <= 4) return SUBSCRIPTION_TIERS.SERIOUS_SELLER;
    return SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER;
  };

  const getNextTierForListings = (neededListings: number): string => {
    if (neededListings <= 100) return SUBSCRIPTION_TIERS.SIDE_HUSTLER;
    return SUBSCRIPTION_TIERS.SERIOUS_SELLER;
  };

  const getNextTierForPhotoAnalysis = (neededAnalyses: number): string => {
    if (neededAnalyses <= 50) return SUBSCRIPTION_TIERS.SIDE_HUSTLER;
    if (neededAnalyses <= 200) return SUBSCRIPTION_TIERS.SERIOUS_SELLER;
    return SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER;
  };

  const canAccessPlatform = (platform: string): boolean => {
    return tierLimits.allowed_platforms.some(p => p === platform);
  };

  const isFoundersPlan = (): boolean => {
    return currentTier === SUBSCRIPTION_TIERS.FOUNDERS;
  };

  return {
    currentTier,
    tierLimits,
    checkFeatureAccess,
    canAccessPlatform,
    isFoundersPlan,
    isAdminOrTester,
    subscriptionStatus
  };
};