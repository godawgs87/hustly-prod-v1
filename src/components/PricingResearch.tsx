
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface PricingResearchProps {
  productTitle: string;
  condition: string;
  onPriceSelect: (price: number, research: string) => void;
}

const PricingResearch = ({ productTitle, condition, onPriceSelect }: PricingResearchProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [customSearch, setCustomSearch] = useState('');
  const { toast } = useToast();

  const handlePricingResearch = async (searchTerm?: string) => {
    const query = searchTerm || productTitle;
    if (!query.trim()) return;

    setIsResearching(true);
    
    try {
      // Simulate API call for pricing research
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock pricing data - in real app, this would come from eBay/Amazon APIs
      const mockData: PricingData = {
        suggestedPrice: Math.floor(Math.random() * 200) + 50,
        priceRange: { min: 30, max: 180 },
        marketTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
        competitors: [
          { source: 'eBay', price: 89.99, condition: 'Used' },
          { source: 'Amazon', price: 120.00, condition: 'New' },
          { source: 'Mercari', price: 75.50, condition: 'Like New' }
        ],
        confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
      };
      
      setPricingData(mockData);
      
      toast({
        title: "Pricing Research Complete",
        description: `Found ${mockData.competitors.length} comparable listings`
      });
      
    } catch (error) {
      toast({
        title: "Research Failed",
        description: "Unable to fetch pricing data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResearching(false);
    }
  };

  const handleSelectPrice = (price: number) => {
    const researchNotes = pricingData ? 
      `Pricing research for ${productTitle}:\n` +
      `Suggested price: $${pricingData.suggestedPrice}\n` +
      `Market trend: ${pricingData.marketTrend}\n` +
      `Comparable prices:\n` +
      pricingData.competitors.map(c => `- ${c.source}: $${c.price} (${c.condition})`).join('\n')
      : '';
    
    onPriceSelect(price, researchNotes);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Pricing Research</h3>
        </div>

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
          >
            {isResearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Researching...
              </>
            ) : (
              'Research'
            )}
          </Button>
        </div>

        {pricingData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ${pricingData.suggestedPrice}
                </div>
                <div className="text-sm text-blue-700">
                  Suggested Price
                </div>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => handleSelectPrice(pricingData.suggestedPrice)}
                >
                  Use This Price
                </Button>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  ${pricingData.priceRange.min} - ${pricingData.priceRange.max}
                </div>
                <div className="text-sm text-gray-600">
                  Market Range
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <Badge 
                    variant={pricingData.marketTrend === 'up' ? 'default' : 
                            pricingData.marketTrend === 'down' ? 'destructive' : 'secondary'}
                  >
                    {pricingData.marketTrend === 'up' ? '↗' : 
                     pricingData.marketTrend === 'down' ? '↘' : '→'} 
                    {pricingData.marketTrend}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Market Trend
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Comparable Listings</h4>
              <div className="space-y-2">
                {pricingData.competitors.map((comp, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comp.source}</span>
                      <Badge variant="outline" className="text-xs">
                        {comp.condition}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${comp.price}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSelectPrice(comp.price)}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>
                Confidence: {pricingData.confidence} • 
                Based on recent {condition.toLowerCase()} condition listings
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PricingResearch;
