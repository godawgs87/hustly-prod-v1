import { useState, useEffect, useCallback } from 'react';
import { 
  CrossPlatformIntelligenceService, 
  type PlatformRecommendation, 
  type PlatformPerformanceMetrics,
  type GraduatedPricingStrategy
} from '@/services/CrossPlatformIntelligenceService';
import { useToast } from '@/hooks/use-toast';

export interface UseCrossPlatformIntelligenceReturn {
  platformMetrics: PlatformPerformanceMetrics[];
  platformRecommendations: PlatformRecommendation[];
  graduatedStrategies: GraduatedPricingStrategy[];
  seasonalInsights: any;
  isLoading: boolean;
  error: string | null;
  getOptimalPlatforms: (listing: any) => Promise<void>;
  createGraduatedPricing: (listingId: string, config: any) => Promise<void>;
  getSeasonalRecommendations: (category: string) => Promise<void>;
  optimizeDistribution: (listings: any[]) => Promise<Record<string, string[]>>;
  refreshMetrics: () => Promise<void>;
}

export function useCrossPlatformIntelligence(): UseCrossPlatformIntelligenceReturn {
  const [platformMetrics, setPlatformMetrics] = useState<PlatformPerformanceMetrics[]>([]);
  const [platformRecommendations, setPlatformRecommendations] = useState<PlatformRecommendation[]>([]);
  const [graduatedStrategies, setGraduatedStrategies] = useState<GraduatedPricingStrategy[]>([]);
  const [seasonalInsights, setSeasonalInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load initial metrics
  useEffect(() => {
    refreshMetrics();
  }, []);

  // Subscribe to real-time intelligence updates
  useEffect(() => {
    const unsubscribe = CrossPlatformIntelligenceService.subscribeToIntelligenceUpdates((update) => {
      // Handle real-time analytics updates
      console.log('Intelligence update:', update);
      
      toast({
        title: 'Analytics Updated',
        description: 'Platform performance metrics have been refreshed',
      });
      
      // Refresh metrics when we get updates
      refreshMetrics();
    });

    return unsubscribe;
  }, [toast]);

  const refreshMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const metrics = await CrossPlatformIntelligenceService.getPlatformPerformanceMetrics();
      setPlatformMetrics(metrics);

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load platform metrics';
      setError(errorMessage);
      toast({
        title: 'Metrics Load Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getOptimalPlatforms = useCallback(async (listing: {
    category: string;
    price: number;
    brand?: string;
    condition: string;
    season?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const recommendations = await CrossPlatformIntelligenceService.recommendOptimalPlatforms(listing);
      setPlatformRecommendations(recommendations);

      toast({
        title: 'Platform Analysis Complete',
        description: `Found ${recommendations.length} optimal platform recommendations`,
      });

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to analyze optimal platforms';
      setError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createGraduatedPricing = useCallback(async (listingId: string, config: {
    basePrice: number;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    marketConditions?: 'hot' | 'normal' | 'slow';
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const strategy = await CrossPlatformIntelligenceService.createGraduatedPricingStrategy(listingId, config);
      setGraduatedStrategies(prev => [...prev, strategy]);

      toast({
        title: 'Graduated Pricing Created',
        description: `${config.aggressiveness} pricing strategy activated with ${strategy.priceDrops.length} price drops`,
      });

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create graduated pricing';
      setError(errorMessage);
      toast({
        title: 'Pricing Strategy Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getSeasonalRecommendations = useCallback(async (category: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const insights = await CrossPlatformIntelligenceService.getSeasonalRecommendations(category);
      setSeasonalInsights(insights);

      toast({
        title: 'Seasonal Analysis Complete',
        description: `${insights.demandForecast} demand forecast for ${insights.currentSeason}`,
      });

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get seasonal recommendations';
      setError(errorMessage);
      toast({
        title: 'Seasonal Analysis Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const optimizeDistribution = useCallback(async (listings: Array<{
    id: string;
    category: string;
    price: number;
    brand?: string;
    condition: string;
  }>) => {
    try {
      setIsLoading(true);
      setError(null);

      const distribution = await CrossPlatformIntelligenceService.optimizeListingDistribution(listings);
      
      const totalDistributed = Object.values(distribution).reduce((sum, list) => sum + list.length, 0);
      
      toast({
        title: 'Distribution Optimized',
        description: `Distributed ${totalDistributed} listings across ${Object.keys(distribution).length} platforms`,
      });

      return distribution;

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to optimize distribution';
      setError(errorMessage);
      toast({
        title: 'Distribution Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    platformMetrics,
    platformRecommendations,
    graduatedStrategies,
    seasonalInsights,
    isLoading,
    error,
    getOptimalPlatforms,
    createGraduatedPricing,
    getSeasonalRecommendations,
    optimizeDistribution,
    refreshMetrics
  };
}