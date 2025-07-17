import { supabase } from '@/integrations/supabase/client';

export interface PlatformPerformanceMetrics {
  platform: string;
  totalListings: number;
  averageDaysToSell: number;
  averagePrice: number;
  conversionRate: number;
  engagementScore: number;
  categoryPerformance: Record<string, {
    averagePrice: number;
    averageDaysToSell: number;
    conversionRate: number;
  }>;
  seasonalTrends: Record<string, number>;
}

export interface PlatformRecommendation {
  platform: string;
  confidenceScore: number;
  reasoning: string[];
  expectedPrice: number;
  expectedDaysToSell: number;
  riskFactors: string[];
}

export interface SeasonalTrend {
  category: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  demandMultiplier: number;
  priceMultiplier: number;
  optimalListingTime: string;
}

export interface GraduatedPricingStrategy {
  id: string;
  listingId: string;
  basePrice: number;
  minimumPrice: number;
  priceDrops: {
    afterDays: number;
    reductionPercentage: number;
    triggerConditions?: {
      minViews?: number;
      maxOffers?: number;
      competitorPricing?: boolean;
    };
  }[];
  isActive: boolean;
  currentPhase: number;
}

export class CrossPlatformIntelligenceService {
  // AI-driven platform selection
  static async recommendOptimalPlatforms(listing: {
    category: string;
    price: number;
    brand?: string;
    condition: string;
    season?: string;
  }): Promise<PlatformRecommendation[]> {
    try {
      // Analyze historical performance data
      const platformMetrics = await this.getPlatformPerformanceMetrics();
      
      // Apply AI scoring algorithm
      const recommendations = platformMetrics.map(metrics => {
        const categoryPerf = metrics.categoryPerformance[listing.category] || {
          averagePrice: metrics.averagePrice,
          averageDaysToSell: metrics.averageDaysToSell,
          conversionRate: metrics.conversionRate
        };

        // Calculate confidence score based on multiple factors
        let confidenceScore = 0;
        const reasoning: string[] = [];
        const riskFactors: string[] = [];

        // Price alignment scoring
        const priceVariance = Math.abs(listing.price - categoryPerf.averagePrice) / categoryPerf.averagePrice;
        if (priceVariance < 0.2) {
          confidenceScore += 25;
          reasoning.push(`Price aligns well with platform average ($${categoryPerf.averagePrice})`);
        } else if (priceVariance > 0.5) {
          confidenceScore -= 15;
          riskFactors.push('Price significantly differs from platform average');
        }

        // Category performance scoring
        if (categoryPerf.conversionRate > 0.1) {
          confidenceScore += 20;
          reasoning.push(`Strong category performance (${(categoryPerf.conversionRate * 100).toFixed(1)}% conversion)`);
        }

        // Platform-specific logic
        if (metrics.platform === 'poshmark' && listing.category?.includes('clothing')) {
          confidenceScore += 15;
          reasoning.push('Poshmark excels with clothing items');
        } else if (metrics.platform === 'mercari' && listing.price < 100) {
          confidenceScore += 10;
          reasoning.push('Mercari performs well for lower-priced items');
        } else if (metrics.platform === 'ebay' && listing.brand) {
          confidenceScore += 12;
          reasoning.push('eBay has strong brand recognition');
        }

        // Seasonal adjustments
        if (listing.season) {
          const seasonalMultiplier = metrics.seasonalTrends[listing.season] || 1;
          if (seasonalMultiplier > 1.1) {
            confidenceScore += 10;
            reasoning.push(`Seasonal demand is high (${(seasonalMultiplier * 100 - 100).toFixed(0)}% above average)`);
          }
        }

        // Speed factor
        if (categoryPerf.averageDaysToSell < 7) {
          confidenceScore += 8;
          reasoning.push('Fast-selling platform for this category');
        }

        return {
          platform: metrics.platform,
          confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
          reasoning,
          expectedPrice: categoryPerf.averagePrice * (listing.season ? metrics.seasonalTrends[listing.season] || 1 : 1),
          expectedDaysToSell: categoryPerf.averageDaysToSell,
          riskFactors
        };
      });

      return recommendations
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 3); // Return top 3 recommendations

    } catch (error) {
      console.error('Error generating platform recommendations:', error);
      return [];
    }
  }

  // Performance analytics
  static async getPlatformPerformanceMetrics(): Promise<PlatformPerformanceMetrics[]> {
    try {
      // This would query real data from platform_listings and listing_analytics tables
      const mockMetrics: PlatformPerformanceMetrics[] = [
        {
          platform: 'poshmark',
          totalListings: 150,
          averageDaysToSell: 12,
          averagePrice: 45,
          conversionRate: 0.15,
          engagementScore: 8.2,
          categoryPerformance: {
            'clothing': { averagePrice: 35, averageDaysToSell: 8, conversionRate: 0.18 },
            'accessories': { averagePrice: 25, averageDaysToSell: 15, conversionRate: 0.12 }
          },
          seasonalTrends: {
            'spring': 1.2,
            'summer': 0.9,
            'fall': 1.1,
            'winter': 1.3
          }
        },
        {
          platform: 'mercari',
          totalListings: 200,
          averageDaysToSell: 8,
          averagePrice: 32,
          conversionRate: 0.22,
          engagementScore: 7.8,
          categoryPerformance: {
            'electronics': { averagePrice: 85, averageDaysToSell: 5, conversionRate: 0.25 },
            'home': { averagePrice: 28, averageDaysToSell: 10, conversionRate: 0.18 }
          },
          seasonalTrends: {
            'spring': 1.0,
            'summer': 1.1,
            'fall': 0.95,
            'winter': 1.05
          }
        },
        {
          platform: 'ebay',
          totalListings: 300,
          averageDaysToSell: 15,
          averagePrice: 67,
          conversionRate: 0.12,
          engagementScore: 9.1,
          categoryPerformance: {
            'collectibles': { averagePrice: 125, averageDaysToSell: 20, conversionRate: 0.08 },
            'electronics': { averagePrice: 95, averageDaysToSell: 12, conversionRate: 0.15 }
          },
          seasonalTrends: {
            'spring': 1.0,
            'summer': 0.85,
            'fall': 1.2,
            'winter': 1.4
          }
        }
      ];

      return mockMetrics;
    } catch (error) {
      console.error('Error fetching platform metrics:', error);
      return [];
    }
  }

  // Graduated pricing strategies
  static async createGraduatedPricingStrategy(
    listingId: string,
    config: {
      basePrice: number;
      aggressiveness: 'conservative' | 'moderate' | 'aggressive';
      marketConditions?: 'hot' | 'normal' | 'slow';
    }
  ): Promise<GraduatedPricingStrategy> {
    const strategies = {
      conservative: {
        priceDrops: [
          { afterDays: 14, reductionPercentage: 5 },
          { afterDays: 28, reductionPercentage: 10 },
          { afterDays: 45, reductionPercentage: 15 }
        ],
        minimumPriceRatio: 0.75
      },
      moderate: {
        priceDrops: [
          { afterDays: 7, reductionPercentage: 5 },
          { afterDays: 14, reductionPercentage: 10 },
          { afterDays: 21, reductionPercentage: 15 },
          { afterDays: 35, reductionPercentage: 20 }
        ],
        minimumPriceRatio: 0.65
      },
      aggressive: {
        priceDrops: [
          { afterDays: 3, reductionPercentage: 8 },
          { afterDays: 7, reductionPercentage: 15 },
          { afterDays: 14, reductionPercentage: 25 },
          { afterDays: 21, reductionPercentage: 35 }
        ],
        minimumPriceRatio: 0.5
      }
    };

    const strategy = strategies[config.aggressiveness];
    
    // Adjust for market conditions
    if (config.marketConditions === 'hot') {
      strategy.priceDrops = strategy.priceDrops.map(drop => ({
        ...drop,
        afterDays: drop.afterDays + 3,
        reductionPercentage: Math.max(2, drop.reductionPercentage - 2)
      }));
    } else if (config.marketConditions === 'slow') {
      strategy.priceDrops = strategy.priceDrops.map(drop => ({
        ...drop,
        afterDays: Math.max(2, drop.afterDays - 2),
        reductionPercentage: drop.reductionPercentage + 3
      }));
    }

    const graduatedStrategy: GraduatedPricingStrategy = {
      id: crypto.randomUUID(),
      listingId,
      basePrice: config.basePrice,
      minimumPrice: config.basePrice * strategy.minimumPriceRatio,
      priceDrops: strategy.priceDrops.map(drop => ({
        ...drop,
        triggerConditions: {
          minViews: drop.afterDays * 2, // Expect 2 views per day minimum
          maxOffers: 0, // No offers received
          competitorPricing: true
        }
      })),
      isActive: true,
      currentPhase: 0
    };

    console.log('Created graduated pricing strategy:', graduatedStrategy);
    return graduatedStrategy;
  }

  // Seasonal optimization
  static async getSeasonalRecommendations(category: string, currentDate = new Date()): Promise<{
    currentSeason: string;
    demandForecast: 'high' | 'medium' | 'low';
    pricingRecommendation: 'increase' | 'maintain' | 'decrease';
    optimalListingTime: string;
    seasonalTips: string[];
  }> {
    const month = currentDate.getMonth();
    const season = this.getCurrentSeason(month);
    
    const seasonalData = await this.getSeasonalTrends(category);
    const currentTrend = seasonalData.find(t => t.season === season);
    
    if (!currentTrend) {
      return {
        currentSeason: season,
        demandForecast: 'medium',
        pricingRecommendation: 'maintain',
        optimalListingTime: 'anytime',
        seasonalTips: ['No specific seasonal data available for this category']
      };
    }

    const demandForecast = currentTrend.demandMultiplier > 1.2 ? 'high' : 
                          currentTrend.demandMultiplier < 0.8 ? 'low' : 'medium';
    
    const pricingRecommendation = currentTrend.priceMultiplier > 1.1 ? 'increase' :
                                 currentTrend.priceMultiplier < 0.9 ? 'decrease' : 'maintain';

    const seasonalTips = this.generateSeasonalTips(category, season, currentTrend);

    return {
      currentSeason: season,
      demandForecast,
      pricingRecommendation,
      optimalListingTime: currentTrend.optimalListingTime,
      seasonalTips
    };
  }

  // Cross-platform optimization
  static async optimizeListingDistribution(listings: Array<{
    id: string;
    category: string;
    price: number;
    brand?: string;
    condition: string;
  }>): Promise<Record<string, string[]>> {
    const distribution: Record<string, string[]> = {
      poshmark: [],
      mercari: [],
      ebay: [],
      facebook: []
    };

    for (const listing of listings) {
      const recommendations = await this.recommendOptimalPlatforms(listing);
      
      // Distribute based on confidence scores and platform capacity
      if (recommendations.length > 0) {
        const topPlatform = recommendations[0].platform;
        distribution[topPlatform] = distribution[topPlatform] || [];
        distribution[topPlatform].push(listing.id);
        
        // Also add to secondary platform if confidence is high enough
        if (recommendations.length > 1 && recommendations[1].confidenceScore > 60) {
          const secondaryPlatform = recommendations[1].platform;
          distribution[secondaryPlatform] = distribution[secondaryPlatform] || [];
          distribution[secondaryPlatform].push(listing.id);
        }
      }
    }

    return distribution;
  }

  // Helper methods
  private static getCurrentSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private static async getSeasonalTrends(category: string): Promise<SeasonalTrend[]> {
    // Mock seasonal trends data - in reality this would come from historical analysis
    const mockTrends: SeasonalTrend[] = [
      {
        category: 'clothing',
        season: 'spring',
        demandMultiplier: 1.3,
        priceMultiplier: 1.1,
        optimalListingTime: 'March 1st - April 15th'
      },
      {
        category: 'clothing',
        season: 'summer',
        demandMultiplier: 0.9,
        priceMultiplier: 0.85,
        optimalListingTime: 'June 1st - July 15th'
      },
      {
        category: 'electronics',
        season: 'winter',
        demandMultiplier: 1.4,
        priceMultiplier: 1.2,
        optimalListingTime: 'November 1st - December 15th'
      }
    ];

    return mockTrends.filter(trend => trend.category === category);
  }

  private static generateSeasonalTips(category: string, season: string, trend: SeasonalTrend): string[] {
    const tips: string[] = [];
    
    if (trend.demandMultiplier > 1.2) {
      tips.push(`High demand season for ${category} - consider listing more items`);
    }
    
    if (trend.priceMultiplier > 1.1) {
      tips.push(`Prices typically ${((trend.priceMultiplier - 1) * 100).toFixed(0)}% higher in ${season}`);
    }
    
    tips.push(`Best time to list: ${trend.optimalListingTime}`);
    
    if (season === 'winter' && category.includes('clothing')) {
      tips.push('Focus on coats, sweaters, and winter accessories');
    } else if (season === 'summer' && category.includes('clothing')) {
      tips.push('Emphasize lightweight fabrics and bright colors');
    }

    return tips;
  }

  // Real-time intelligence updates
  static subscribeToIntelligenceUpdates(callback: (update: any) => void): () => void {
    const channel = supabase
      .channel('intelligence-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_analytics'
      }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}