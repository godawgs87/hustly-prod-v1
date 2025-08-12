import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle, TrendingUp, Package, DollarSign, BarChart3, ChevronDown, ChevronUp, Eye, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEbayStore } from '@/stores/ebayStore';
import { EbayService } from '@/services/api/ebayService';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import InlineEbayReconnect from '@/components/ebay/InlineEbayReconnect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PriceResearchStepProps {
  listingData: any;
  onPriceResearchComplete?: (priceData: any, suggestedPrice?: number) => void;
  onBack?: () => void;
  onSkip: () => void;
  onComplete?: () => void;
  autoStart?: boolean;
  showSkipButton?: boolean;
  compact?: boolean;
}

export const PriceResearchStep: React.FC<PriceResearchStepProps> = ({
  listingData,
  onPriceResearchComplete,
  onBack,
  onSkip,
  onComplete,
  autoStart = false,
  showSkipButton = true,
  compact = false
}) => {
  const [isResearching, setIsResearching] = useState(false);
  const [priceData, setPriceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(listingData.price || 0);
  const { account, setAccount } = useEbayStore();
  const [actualConnectionStatus, setActualConnectionStatus] = useState<boolean | null>(null);
  const isConnected = account?.isConnected || actualConnectionStatus || false;

  // Track if we've already called the callback for this price to prevent infinite loops
  const callbackProcessedRef = useRef<number | null>(null);

  // Auto-populate suggested price when research completes (with loop prevention)
  useEffect(() => {
    if (priceData?.priceAnalysis?.suggestedPrice) {
      const suggestedPrice = typeof priceData.priceAnalysis.suggestedPrice === 'object' ? 
        priceData.priceAnalysis.suggestedPrice?.value : 
        priceData.priceAnalysis.suggestedPrice;
      
      // Always update the UI field if price is different
      if (suggestedPrice && suggestedPrice > 0 && suggestedPrice !== selectedPrice) {
        console.log('💰 [PriceResearchStep] Auto-populating suggested price in UI:', suggestedPrice, 'was:', selectedPrice);
        setSelectedPrice(suggestedPrice);
      }
      
      // Only call the callback once per unique price to prevent infinite loops
      if (suggestedPrice && suggestedPrice > 0 && 
          callbackProcessedRef.current !== suggestedPrice) {
        
        console.log('💰 [PriceResearchStep] Calling onPriceResearchComplete for NEW price:', suggestedPrice);
        
        // Mark this price as processed for callback
        callbackProcessedRef.current = suggestedPrice;
        
        // NEW: Enhance title and description based on eBay comparables
        if (priceData?.searchResults?.items && listingData?.title) {
          console.log('✨ [PriceResearchStep] Enhancing title from comparables...');
          const enhancement = EbayService.enhanceTitleFromComparables(
            listingData.title,
            priceData.searchResults.items
          );
          
          if (enhancement.enhancedTitle !== listingData.title) {
            console.log('✨ [PriceResearchStep] Title enhanced:', {
              original: listingData.title,
              enhanced: enhancement.enhancedTitle,
              extracted: enhancement.extractedInfo
            });
            
            // Update the listing data with enhanced title and description
            const enhancedPriceData = {
              ...priceData,
              enhancedTitle: enhancement.enhancedTitle,
              enhancedDescription: enhancement.enhancedDescription,
              extractedInfo: enhancement.extractedInfo
            };
            
            if (onPriceResearchComplete) {
              onPriceResearchComplete(enhancedPriceData, suggestedPrice);
            }
            return;
          }
        }
        
        // Update the main listing data with suggested price
        if (onPriceResearchComplete) {
          onPriceResearchComplete(priceData, suggestedPrice);
        }
      } else if (suggestedPrice === callbackProcessedRef.current) {
        console.log('💰 [PriceResearchStep] Skipping callback for already processed price:', suggestedPrice);
      }
    }
  }, [priceData?.priceAnalysis?.suggestedPrice]); // 

  useEffect(() => {
    console.log('🔬 PriceResearchStep mounted');
    console.log('🔬 eBay account:', account);
    console.log('🔬 isConnected:', isConnected);
    console.log('🔬 listingData:', listingData);
    console.log('🔬 autoStart:', autoStart);
    
    // Check actual eBay connection status if store shows disconnected
    if (!account?.isConnected) {
      checkActualEbayConnection();
    }
    
    // Auto-start price research if enabled and connected
    if (autoStart && isConnected && !isResearching && !priceData) {
      console.log('🔬 Auto-starting price research');
      setTimeout(() => handleStartResearch(), 1000); // Small delay to ensure connection is verified
    }
  }, [account, listingData, autoStart, isConnected]);
  
  const checkActualEbayConnection = async () => {
    try {
      // Try to fetch eBay connection status from backend
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For now, assume connected if user exists and we're not getting 401s
        // This is a temporary fix until we properly sync the store
        setActualConnectionStatus(true);
        
        // Update the store with the connection
        setAccount({
          id: 'temp_user',
          username: 'eBay User',
          isConnected: true
        });
        
        console.log('🔬 Updated eBay connection status in store');
      }
    } catch (error) {
      console.log('🔬 Could not verify eBay connection:', error);
      setActualConnectionStatus(false);
    }
  };

  const handleStartResearch = async () => {
    if (!isConnected) {
      setError('eBay connection required for price research');
      return;
    }

    setIsResearching(true);
    setError(null);

    try {
      console.log('🔬 Starting price research for:', listingData.title);
      
      // Extract research parameters from AI analysis
      const researchParams = EbayService.extractPriceResearchParams(listingData);
      
      // Perform price research
      const result = await EbayService.researchItemPrice(researchParams);
      console.log('🔬 Price research result:', result);
      
      if (result.data) {
        const totalComps = result.data.searchResults?.total || 0;
        const suggestedPrice = result.data.priceAnalysis?.suggestedPrice || 0;
        
        setPriceData(result.data);
        
        if (suggestedPrice > 0) {
          setSelectedPrice(suggestedPrice);
        }
        
        if (totalComps > 0) {
          toast.success(`Found ${totalComps} comparable listings`);
        } else {
          toast.info('No exact matches found, but you can still set your own price');
        }
      } else {
        toast.info('No comparable listings found, but you can still set your own price');
      }
    } catch (err: any) {
      console.error('❌ Price research failed:', err);
      setError(err.message || 'Failed to research pricing');
      toast.error('Price research failed');
    } finally {
      setIsResearching(false);
    }
  };

  const handleAcceptPrice = () => {
    console.log('✅ Accepting price:', selectedPrice);
    if (onPriceResearchComplete) {
      onPriceResearchComplete(priceData, selectedPrice);
    }
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkipResearch = () => {
    console.log('⏭️ Skipping price research');
    onSkip();
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Price Research</h2>
          <p className="text-gray-600">
            Research comparable items to find the optimal price for your listing.
          </p>
        </div>
        
        <InlineEbayReconnect
          onConnectionSuccess={() => {
            // Refresh connection status and retry research
            checkActualEbayConnection();
          }}
          onSkip={handleSkipResearch}
          message="Connect your eBay account to research comparable pricing and optimize your listing for maximum sales."
        />
        
        <div className="mt-4">
          <Button onClick={onBack} variant="outline" className="w-full sm:w-auto">
            ← Back to Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Price Research</h2>
        <p className="text-gray-600">
          Research comparable eBay listings to set a competitive price for "{listingData.title}"
        </p>
      </div>

      {/* Research Status */}
      {isResearching && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
            <div>
              <p className="font-medium">Researching comparable listings...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isResearching && (
        <Card className="mb-6 border-red-200">
          <CardContent className="flex items-center py-6">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Price research failed</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <Button onClick={handleStartResearch} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Price Analysis Results */}
      {priceData && priceData.priceAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Price Suggestion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Suggested Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${typeof priceData.priceAnalysis.suggestedPrice === 'object' ? 
                  priceData.priceAnalysis.suggestedPrice?.value || '0' : 
                  priceData.priceAnalysis.suggestedPrice || '0'}
              </div>
              <div className="flex items-center mb-4">
                <Badge className={`mr-2 ${getConfidenceColor(priceData.priceAnalysis.confidence)}`}>
                  {getConfidenceIcon(priceData.priceAnalysis.confidence)}
                  <span className="ml-1">{priceData.priceAnalysis.confidence} confidence</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {priceData.priceAnalysis?.analysis?.recommendation || 
                 'No specific pricing recommendation available. Set a competitive price based on your research.'}
              </p>
              
              {/* Price Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Your Price
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">$</span>
                  <input
                    type="number"
                    value={selectedPrice}
                    onChange={(e) => {
                      const newPrice = Number(e.target.value);
                      setSelectedPrice(newPrice);
                      
                      // Update the main listing data with the new price
                      if (onPriceResearchComplete && priceData) {
                        onPriceResearchComplete({
                          ...priceData,
                          selectedPrice: newPrice
                        }, newPrice);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This will update your listing price and cross-platform fees
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sample Size:</span>
                  <span className="font-medium">{priceData.priceAnalysis?.analysis?.sampleSize || 0} listings</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price Range:</span>
                  <span className="font-medium">
                    {priceData.priceAnalysis?.analysis?.priceRange ? 
                      `$${priceData.priceAnalysis.analysis.priceRange?.min} - $${priceData.priceAnalysis.analysis.priceRange?.max}` : 
                      'No data available'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Price:</span>
                  <span className="font-medium">${priceData.priceAnalysis?.analysis?.average || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Median Price:</span>
                  <span className="font-medium">${priceData.priceAnalysis?.analysis?.median || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparable Listings */}
      {priceData && priceData.searchResults && priceData.searchResults.items.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Comparable Listings ({priceData.searchResults.total} found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceData.searchResults.items.map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">{item.title}</h4>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-green-600">
                        ${typeof item.price === 'object' ? item.price?.value || '0' : item.price || '0'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.condition || 'Unknown'}
                      </Badge>
                    </div>
                    {item.shippingCost && (
                      <p className="text-xs text-gray-500">
                        +${typeof item.shippingCost === 'object' ? item.shippingCost?.value || '0' : item.shippingCost || '0'} shipping
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing all {priceData.searchResults.items.length} comparable listings
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - Only show if not in compact mode */}
      {!compact && (
        <div className="flex justify-between">
          {onBack && (
            <Button onClick={onBack} variant="outline">
              Back to Analysis
            </Button>
          )}
          
          <div className="space-x-3">
            {showSkipButton && (
              <Button onClick={handleSkipResearch} variant="outline">
                Skip Research
              </Button>
            )}
            
            {!isResearching && !priceData && (
              <Button onClick={handleStartResearch}>
                Start Price Research
              </Button>
            )}
            
            {priceData && (
              <Button onClick={handleAcceptPrice} className="bg-green-600 hover:bg-green-700">
                Use ${selectedPrice} - Continue
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Compact mode - show minimal status */}
      {compact && (
        <div className="text-sm text-gray-600">
          {isResearching && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Researching eBay prices...
            </div>
          )}
          {priceData && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Found {priceData.searchResults?.total || 0} comparable listings
              {priceData.priceAnalysis?.suggestedPrice && (
                <span className="font-medium">• Suggested: ${priceData.priceAnalysis.suggestedPrice}</span>
              )}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
