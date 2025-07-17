import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertCircle, Sparkles, Zap, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PricingData {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  marketTrend: 'up' | 'down' | 'stable';
  competitors: Array<{
    source: string;
    price: number;
    condition: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

interface EnhancedPricingAssistantProps {
  productTitle: string;
  condition: string;
  category?: string;
  currentPrice?: number;
  onPriceSelect: (price: number, research: string) => void;
  autoTrigger?: boolean;
}

const EnhancedPricingAssistant = ({ 
  productTitle, 
  condition, 
  category,
  currentPrice,
  onPriceSelect,
  autoTrigger = false
}: EnhancedPricingAssistantProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [customSearch, setCustomSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const { toast } = useToast();

  // Auto-trigger pricing research when conditions are met
  useEffect(() => {
    if (autoTrigger && productTitle && condition && !hasAutoTriggered && !currentPrice) {
      handlePricingResearch();
      setHasAutoTriggered(true);
    }
  }, [productTitle, condition, autoTrigger, hasAutoTriggered, currentPrice]);

  const handlePricingResearch = async (searchTerm?: string) => {
    const query = searchTerm || productTitle;
    if (!query.trim()) return;

    setIsResearching(true);
    setIsExpanded(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('pricing-research', {
        body: { query, condition, category }
      });

      if (error) {
        throw error;
      }

      if (data && data.suggestedPrice > 0) {
        setPricingData(data);
        toast({
          title: "💰 Pricing Research Complete",
          description: `Found competitive pricing data with ${data.confidence} confidence`,
          variant: "default"
        });
      } else {
        setPricingData(null);
        toast({
          title: "No Pricing Data Found",
          description: "Try adjusting your search terms or product title.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Pricing research error:', error);
      toast({
        title: "Research Failed",
        description: "Unable to fetch pricing data. Please try again.",
        variant: "destructive"
      });
      setPricingData(null);
    } finally {
      setIsResearching(false);
    }
  };

  const handleSelectPrice = (price: number) => {
    const researchNotes = pricingData ? 
      `AI Pricing Research for ${productTitle}:\n` +
      `✨ Suggested price: $${pricingData.suggestedPrice}\n` +
      `📈 Market trend: ${pricingData.marketTrend}\n` +
      `🎯 Price range: $${pricingData.priceRange.min} - $${pricingData.priceRange.max}\n` +
      `🔍 Comparable listings:\n` +
      pricingData.competitors.map(c => `  • ${c.source}: $${c.price} (${c.condition})`).join('\n')
      : '';
    
    onPriceSelect(price, researchNotes);
    toast({
      title: "Price Applied",
      description: `Set price to $${price} based on market research`,
      variant: "default"
    });
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-50 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const shouldShowCompact = !isExpanded && !pricingData && !isResearching;

  if (shouldShowCompact) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Smart Pricing</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
            <Button 
              size="sm" 
              onClick={() => handlePricingResearch()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Target className="w-4 h-4 mr-2" />
              Get Pricing
            </Button>
          </div>
          {productTitle && (
            <p className="text-sm text-muted-foreground">
              Research competitive pricing for "{productTitle}"
            </p>
          )}
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Smart Pricing Assistant</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
          {pricingData && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Minimize' : 'Expand'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            placeholder={`Search pricing for "${productTitle}" or enter custom term...`}
            className="flex-1"
          />
          <Button 
            onClick={() => handlePricingResearch(customSearch)}
            disabled={isResearching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isResearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Research
              </>
            )}
          </Button>
        </div>

        {pricingData && (
          <div className="space-y-4">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 border-green-200 hover:bg-green-50"
                onClick={() => handleSelectPrice(pricingData.suggestedPrice)}
              >
                <div className="text-2xl font-bold text-green-600">
                  ${pricingData.suggestedPrice}
                </div>
                <div className="text-xs text-green-700 font-medium">
                  AI Suggested Price
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Use This
                </Badge>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 border-blue-200 hover:bg-blue-50"
                onClick={() => handleSelectPrice(pricingData.priceRange.max)}
              >
                <div className="text-xl font-bold text-blue-600">
                  ${pricingData.priceRange.max}
                </div>
                <div className="text-xs text-blue-700 font-medium">
                  Maximum Price
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Premium
                </Badge>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 border-orange-200 hover:bg-orange-50"
                onClick={() => handleSelectPrice(pricingData.priceRange.min)}
              >
                <div className="text-xl font-bold text-orange-600">
                  ${pricingData.priceRange.min}
                </div>
                <div className="text-xs text-orange-700 font-medium">
                  Quick Sale Price
                </div>
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  Fast Sale
                </Badge>
              </Button>
            </div>

            {/* Market Insights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Badge 
                    variant={pricingData.marketTrend === 'up' ? 'default' : 
                            pricingData.marketTrend === 'down' ? 'destructive' : 'secondary'}
                  >
                    {pricingData.marketTrend === 'up' ? '📈' : 
                     pricingData.marketTrend === 'down' ? '📉' : '➡️'} 
                    {pricingData.marketTrend}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">Market Trend</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Badge className={getConfidenceColor(pricingData.confidence)}>
                    {pricingData.confidence} confidence
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">Research Quality</div>
              </div>
            </div>

            {/* Detailed Comparisons */}
            {isExpanded && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Comparable Listings
                </h4>
                <div className="space-y-2">
                  {pricingData.competitors.map((comp, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{comp.source}</span>
                        <Badge variant="outline" className="text-xs">
                          {comp.condition}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">${comp.price}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSelectPrice(comp.price)}
                          className="text-xs"
                        >
                          Use Price
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>
                Based on {pricingData.competitors.length} recent {condition.toLowerCase()} condition listings
                {category && ` in ${category}`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPricingAssistant;