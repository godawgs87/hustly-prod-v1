import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSubscriptionManagement } from './useSubscriptionManagement';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_FEATURES, TIER_LIMITS, ADDON_TYPES } from '@/utils/constants';
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
        .select('user_role, subscription_tier, subscription_status, billing_cycle_start, billing_cycle_end, listings_used_this_cycle')
        .eq('id', session.user.id)
        .maybeSingle();

      return profile;
    },
  });

  const { data: userAddons } = useQuery({
    queryKey: ['userAddons'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];

      const { data: addons } = await supabase
        .from('user_addons')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .gte('billing_cycle_end', new Date().toISOString().split('T')[0]);

      return addons || [];
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
    const hasBulkUploadAddon = userAddons?.some(addon => addon.addon_type === ADDON_TYPES.BULK_UPLOAD_BOOST) || false;
    
    switch (feature) {
      case SUBSCRIPTION_FEATURES.BULK_UPLOAD:
        const hasBulkAccess = (limits.features as readonly string[]).includes('bulk_upload') || hasBulkUploadAddon;
        return {
          hasAccess: hasBulkAccess,
          isAtLimit: false,
          currentUsage: 0,
          limit: -1,
          upgradeRequired: hasBulkAccess 
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
        const extraListings = userAddons?.filter(addon => addon.addon_type === ADDON_TYPES.EXTRA_LISTINGS)
          .reduce((total, addon) => total + addon.addon_value, 0) || 0;
        const totalListingsLimit = maxListings === -1 ? -1 : maxListings + extraListings;
        const isAtListingLimit = totalListingsLimit !== -1 && currentUsage >= totalListingsLimit;
        return {
          hasAccess: !isAtListingLimit,
          isAtLimit: isAtListingLimit,
          currentUsage,
          limit: totalListingsLimit,
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
    if (neededListings <= 300) return SUBSCRIPTION_TIERS.SERIOUS_SELLER;
    return SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER;
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

  const getBillingCycleInfo = () => {
    if (!userProfile?.billing_cycle_start || !userProfile?.billing_cycle_end) {
      return {
        daysLeft: 30,
        cycleStart: new Date(),
        cycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        listingsUsed: userProfile?.listings_used_this_cycle || 0
      };
    }

    const cycleStart = new Date(userProfile.billing_cycle_start);
    const cycleEnd = new Date(userProfile.billing_cycle_end);
    const today = new Date();
    const daysLeft = Math.max(0, Math.ceil((cycleEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      daysLeft,
      cycleStart,
      cycleEnd,
      listingsUsed: userProfile.listings_used_this_cycle || 0
    };
  };

  return {
    currentTier,
    tierLimits,
    checkFeatureAccess,
    canAccessPlatform,
    isFoundersPlan,
    isAdminOrTester,
    subscriptionStatus,
    userAddons: userAddons || [],
    getBillingCycleInfo
  };
};