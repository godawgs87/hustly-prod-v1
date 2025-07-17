import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Brain,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useCrossPlatformIntelligence } from '@/hooks/useCrossPlatformIntelligence';

interface CrossPlatformIntelligenceDashboardProps {
  listing?: {
    id: string;
    category: string;
    price: number;
    brand?: string;
    condition: string;
  };
  className?: string;
}

export function CrossPlatformIntelligenceDashboard({ listing, className }: CrossPlatformIntelligenceDashboardProps) {
  const {
    platformMetrics,
    platformRecommendations,
    graduatedStrategies,
    seasonalInsights,
    isLoading,
    getOptimalPlatforms,
    createGraduatedPricing,
    getSeasonalRecommendations,
    refreshMetrics
  } = useCrossPlatformIntelligence();

  const [selectedCategory, setSelectedCategory] = useState('clothing');
  const [pricingConfig, setPricingConfig] = useState({
    aggressiveness: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
    marketConditions: 'normal' as 'hot' | 'normal' | 'slow'
  });

  useEffect(() => {
    if (listing?.category) {
      getSeasonalRecommendations(listing.category);
    }
  }, [listing?.category, getSeasonalRecommendations]);

  const handleAnalyzeListing = async () => {
    if (listing) {
      await getOptimalPlatforms(listing);
    }
  };

  const handleCreateGraduatedPricing = async () => {
    if (listing) {
      await createGraduatedPricing(listing.id, {
        basePrice: listing.price,
        ...pricingConfig
      });
    }
  };

  const handleSeasonalAnalysis = async () => {
    await getSeasonalRecommendations(selectedCategory);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Cross-Platform Intelligence
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline"
              onClick={refreshMetrics}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recommendations" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="pricing">Smart Pricing</TabsTrigger>
              <TabsTrigger value="seasonal">Seasonal Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {/* Platform Recommendations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Optimal Platform Recommendations
                  </h4>
                  {listing && (
                    <Button 
                      size="sm" 
                      onClick={handleAnalyzeListing}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      Analyze Listing
                    </Button>
                  )}
                </div>

                {platformRecommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {listing ? 'Click "Analyze Listing" to get AI recommendations' : 'Select a listing to get platform recommendations'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {platformRecommendations.map((rec, index) => (
                      <Card key={rec.platform} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize">{rec.platform}</span>
                              <Badge variant={getConfidenceBadgeVariant(rec.confidenceScore)}>
                                {rec.confidenceScore}% confidence
                              </Badge>
                              {index === 0 && <Badge variant="outline">Recommended</Badge>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${rec.expectedPrice}</p>
                            <p className="text-xs text-muted-foreground">{rec.expectedDaysToSell} days avg</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Progress value={rec.confidenceScore} className="h-2" />
                          
                          {rec.reasoning.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-green-600">Strengths:</p>
                              {rec.reasoning.map((reason, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">{reason}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {rec.riskFactors.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-yellow-600">Considerations:</p>
                              {rec.riskFactors.map((risk, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">{risk}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              {/* Platform Performance Metrics */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Platform Performance Overview
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platformMetrics.map((metrics) => (
                    <Card key={metrics.platform}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm capitalize">{metrics.platform}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Avg Price</p>
                            <p className="font-medium">${metrics.averagePrice}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Days</p>
                            <p className="font-medium">{metrics.averageDaysToSell}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversion</p>
                            <p className="font-medium">{(metrics.conversionRate * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Engagement</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <p className="font-medium">{metrics.engagementScore.toFixed(1)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Total Listings</p>
                          <div className="flex items-center gap-2">
                            <Progress value={(metrics.totalListings / 500) * 100} className="flex-1" />
                            <span className="text-xs font-medium">{metrics.totalListings}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              {/* Graduated Pricing Strategy */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Graduated Pricing Strategy
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Strategy Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Price Drop Strategy</label>
                        <Select 
                          value={pricingConfig.aggressiveness} 
                          onValueChange={(value: any) => setPricingConfig(prev => ({ ...prev, aggressiveness: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative (Slower drops)</SelectItem>
                            <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                            <SelectItem value="aggressive">Aggressive (Faster drops)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium">Market Conditions</label>
                        <Select 
                          value={pricingConfig.marketConditions} 
                          onValueChange={(value: any) => setPricingConfig(prev => ({ ...prev, marketConditions: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hot">Hot Market (Slower drops)</SelectItem>
                            <SelectItem value="normal">Normal Market</SelectItem>
                            <SelectItem value="slow">Slow Market (Faster drops)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleCreateGraduatedPricing}
                        disabled={!listing || isLoading}
                        className="w-full gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Create Pricing Strategy
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Active Strategies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {graduatedStrategies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active pricing strategies</p>
                      ) : (
                        <div className="space-y-3">
                          {graduatedStrategies.map((strategy) => (
                            <div key={strategy.id} className="p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Listing Strategy</span>
                                <Badge variant={strategy.isActive ? 'default' : 'secondary'}>
                                  {strategy.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Base Price</p>
                                  <p className="font-medium">${strategy.basePrice}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Min Price</p>
                                  <p className="font-medium">${strategy.minimumPrice}</p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Progress value={(strategy.currentPhase / strategy.priceDrops.length) * 100} className="h-1" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Phase {strategy.currentPhase + 1} of {strategy.priceDrops.length}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seasonal" className="space-y-4">
              {/* Seasonal Insights */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Seasonal Market Intelligence
                  </h4>
                  <div className="flex items-center gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="home">Home & Garden</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      onClick={handleSeasonalAnalysis}
                      disabled={isLoading}
                    >
                      Analyze
                    </Button>
                  </div>
                </div>

                {seasonalInsights ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Current Season Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Season</p>
                            <p className="font-medium capitalize">{seasonalInsights.currentSeason}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Demand Forecast</p>
                            <Badge variant={
                              seasonalInsights.demandForecast === 'high' ? 'default' :
                              seasonalInsights.demandForecast === 'medium' ? 'secondary' : 'destructive'
                            }>
                              {seasonalInsights.demandForecast}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">Pricing Recommendation</p>
                          <div className="flex items-center gap-2 mt-1">
                            {seasonalInsights.pricingRecommendation === 'increase' && <TrendingUp className="w-4 h-4 text-green-600" />}
                            {seasonalInsights.pricingRecommendation === 'decrease' && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
                            {seasonalInsights.pricingRecommendation === 'maintain' && <Eye className="w-4 h-4 text-blue-600" />}
                            <span className="text-sm font-medium capitalize">{seasonalInsights.pricingRecommendation} Prices</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Optimal Listing Time</p>
                          <p className="text-sm font-medium">{seasonalInsights.optimalListingTime}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Seasonal Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {seasonalInsights.seasonalTips.map((tip: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a category and click "Analyze" to get seasonal insights</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}