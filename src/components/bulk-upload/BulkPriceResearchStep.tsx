import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  SkipForward,
  ArrowRight
} from 'lucide-react';
import { EbayService } from '@/services/api/ebayService';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import PlatformTokenExpiryWarning from '@/components/platforms/PlatformTokenExpiryWarning';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkPriceResearchStepProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithPrices: PhotoGroup[]) => void;
  onBack: () => void;
  onSkip: () => void;
  isResearching?: boolean;
}

interface PriceResearchProgress {
  groupId: string;
  status: 'pending' | 'researching' | 'completed' | 'error' | 'skipped';
  originalPrice?: number;
  researchedPrice?: number;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

const BulkPriceResearchStep: React.FC<BulkPriceResearchStepProps> = ({
  photoGroups,
  onComplete,
  onBack,
  onSkip,
  isResearching = false
}) => {
  const { user } = useAuth();
  
  // Helper function to check if token is expired
  const isTokenExpired = (account: any) => {
    if (!account.token_expires_at) return false;
    const expiryTime = new Date(account.token_expires_at).getTime();
    const now = Date.now();
    return expiryTime <= now;
  };
  
  // CRITICAL FIX: Aggressive eBay connection check with no caching for ammac89 bug
  const { data: marketplaceAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['marketplace-accounts-price-research', user?.id, Date.now()], // Force fresh data
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('🔍 PRICE RESEARCH: Fetching fresh eBay connection data for user:', user.id);
      
      // Force fresh database query with no cache
      const { data, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'ebay');
        
      if (error) {
        console.error('❌ PRICE RESEARCH: Database error:', error);
        throw error;
      }
      
      console.log('✅ PRICE RESEARCH: Fresh eBay account data:', data);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0, // No caching - always fresh
    gcTime: 0, // Don't cache results
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
  
  const ebayAccount = marketplaceAccounts?.find(acc => acc.platform === 'ebay' && acc.is_connected);
  const isConnected = !!ebayAccount && ebayAccount.oauth_token && !isTokenExpired(ebayAccount);
  const [progress, setProgress] = useState<PriceResearchProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedGroups, setCompletedGroups] = useState<PhotoGroup[]>([]);

  // Initialize progress tracking
  useEffect(() => {
    const initialProgress = photoGroups.map(group => ({
      groupId: group.id,
      status: 'pending' as const,
      originalPrice: group.listingData?.price || 0
    }));
    setProgress(initialProgress);
    setCompletedGroups([...photoGroups]);
  }, [photoGroups]);

  const updateProgress = (groupId: string, update: Partial<PriceResearchProgress>) => {
    setProgress(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, ...update } : p
    ));
  };

  const researchPriceForGroup = async (group: PhotoGroup): Promise<PhotoGroup> => {
    const groupId = group.id;
    
    try {
      updateProgress(groupId, { status: 'researching' });

      if (!group.listingData?.title || !group.listingData?.category) {
        throw new Error('Missing required data for price research');
      }

      // Extract parameters for price research
      const params = {
        query: group.listingData.title,
        category: group.listingData.category,
        brand: (group.listingData as any).brand || '',
        condition: group.listingData.condition || 'Used'
      };

      // Research the price
      const priceData = await EbayService.researchItemPrice(params);
      
      console.log('🔍 Price research result for', params.query, ':', priceData);
      console.log('🔍 Price data type:', typeof priceData);
      console.log('🔍 Price data keys:', Object.keys(priceData || {}));
      console.log('🔍 Price data.data:', priceData?.data);
      console.log('🔍 Direct suggestedPrice:', priceData?.suggestedPrice);
      
      // Check for API errors FIRST, before any price extraction
      const apiError = priceData?.data?.error || priceData?.error;
      console.log('🔍 Checking for API errors:', { apiError, hasError: !!apiError });
      
      if (apiError) {
        console.error('🚨 API Error detected, throwing error:', apiError);
        const errorMessage = (typeof apiError === 'string' && apiError.includes('invalid_scope')) 
          ? 'eBay connection expired. Please reconnect your eBay account in Settings.' 
          : 'eBay API request failed';
        console.error('🚨 Throwing error message:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('✅ No API errors detected, proceeding with price extraction');
      
      // Try multiple extraction strategies
      let actualData, suggestedPrice, averagePrice, confidence, totalComps;
      
      // Strategy 1: Direct access
      if (priceData?.suggestedPrice !== undefined) {
        actualData = priceData;
        suggestedPrice = priceData.suggestedPrice;
        averagePrice = priceData.averagePrice;
        confidence = priceData.confidence;
        totalComps = priceData.totalComps;
        console.log('✅ Using direct access strategy');
      }
      // Strategy 2: Nested in data.priceAnalysis (ACTUAL STRUCTURE)
      else if (priceData?.data?.priceAnalysis?.suggestedPrice !== undefined) {
        actualData = priceData.data.priceAnalysis;
        suggestedPrice = priceData.data.priceAnalysis.suggestedPrice;
        averagePrice = priceData.data.priceAnalysis.averagePrice;
        confidence = priceData.data.priceAnalysis.confidence;
        totalComps = priceData.data.priceAnalysis.totalComps;
        console.log('✅ Using priceAnalysis nested strategy');
      }
      // Strategy 3: Nested in data property (old structure)
      else if (priceData?.data?.suggestedPrice !== undefined) {
        actualData = priceData.data;
        suggestedPrice = priceData.data.suggestedPrice;
        averagePrice = priceData.data.averagePrice;
        confidence = priceData.data.confidence;
        totalComps = priceData.data.totalComps;
        console.log('✅ Using nested data strategy');
      }
      // Strategy 4: Fallback
      else {
        actualData = priceData?.data || priceData;
        suggestedPrice = actualData?.suggestedPrice;
        averagePrice = actualData?.averagePrice;
        confidence = actualData?.confidence;
        totalComps = actualData?.totalComps;
        console.log('⚠️ Using fallback strategy');
        console.log('🔍 Fallback actualData:', actualData);
      }
      
      console.log('📊 Extracted price data:', { suggestedPrice, averagePrice, confidence, totalComps });
      
      // Check for valid price data (must be > 0 and not null/undefined)
      const hasValidPrice = (suggestedPrice && suggestedPrice > 0) || (averagePrice && averagePrice > 0);
      
      if (actualData && hasValidPrice) {
        const finalPrice = suggestedPrice || averagePrice;
        updateProgress(groupId, { 
          status: 'completed',
          researchedPrice: finalPrice,
          confidence: confidence || 'medium'
        });

        // Update the group with researched price
        const updatedGroup = {
          ...group,
          listingData: {
            ...group.listingData,
            price: finalPrice,
            priceResearch: JSON.stringify({
              originalPrice: group.listingData.price || 0,
              researchedPrice: finalPrice,
              confidence: confidence,
              comparableCount: totalComps || 0,
              researchedAt: new Date().toISOString()
            })
          }
        };

        return updatedGroup;
      } else {
        throw new Error('No price data found');
      }
    } catch (error) {
      console.error(`Price research failed for group ${groupId}:`, error);
      
      // Provide user-friendly error messages
      let userMessage = 'Price research failed';
      if (error instanceof Error) {
        if (error.message.includes('eBay connection expired') || error.message.includes('invalid_scope')) {
          userMessage = 'eBay connection expired. Please reconnect your eBay account in Settings.';
        } else if (error.message.includes('No price data found')) {
          userMessage = 'No comparable items found for pricing. You can set the price manually.';
        } else {
          userMessage = error.message;
        }
      }
      
      updateProgress(groupId, { 
        status: 'error', 
        error: userMessage
      });
      throw new Error(userMessage);
    }
  };

  const startBulkPriceResearch = async () => {
    if (!isConnected) {
      console.warn('eBay not connected, skipping price research');
      onSkip();
      return;
    }

    setIsProcessing(true);
    const updatedGroups: PhotoGroup[] = [];

    for (let i = 0; i < photoGroups.length; i++) {
      setCurrentIndex(i);
      const group = photoGroups[i];
      
      try {
        const updatedGroup = await researchPriceForGroup(group);
        updatedGroups.push(updatedGroup);
        
        // Small delay to prevent rate limiting
        if (i < photoGroups.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to research price for group ${group.id}:`, error);
        updatedGroups.push(group); // Keep original if research fails
      }
    }

    setCompletedGroups(updatedGroups);
    setIsProcessing(false);
    onComplete(updatedGroups);
  };

  const getStatusIcon = (status: PriceResearchProgress['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'researching': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped': return <SkipForward className="w-4 h-4 text-gray-400" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-200" />;
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      low: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={`text-xs ${colors[confidence as keyof typeof colors]}`}>
        {confidence} confidence
      </Badge>
    );
  };

  const completedCount = progress.filter(p => p.status === 'completed').length;
  const errorCount = progress.filter(p => p.status === 'error').length;
  const overallProgress = ((completedCount + errorCount) / photoGroups.length) * 100;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-xl font-semibold">eBay Connection Required</h3>
        <p className="text-muted-foreground max-w-md">
          Price research requires an active eBay connection. You can skip this step and set prices manually, 
          or connect your eBay account to get automated market pricing.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            Back to Review
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Skip Price Research
          </Button>
        </div>
      </div>
    );
  }

  if (!isProcessing && completedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold">Ready for Price Research</h3>
        <p className="text-muted-foreground max-w-md">
          We'll automatically research market prices for all {photoGroups.length} items using eBay's sold listings data. 
          This will help optimize your pricing for better sales.
        </p>
        
        {/* eBay Token Expiry Warning */}
        <PlatformTokenExpiryWarning platformId="ebay" showOnlyIfExpiringSoon={false} className="max-w-md" />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <h4 className="font-medium mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-blue-600" />
            What we'll research:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Recent sold listings for comparable items</li>
            <li>• Market price trends and competition</li>
            <li>• Optimal pricing based on condition</li>
            <li>• Confidence levels for each suggestion</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            Back to Review
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Skip Research
          </Button>
          <Button onClick={startBulkPriceResearch} className="bg-blue-600 hover:bg-blue-700">
            <TrendingUp className="w-4 h-4 mr-2" />
            Start Price Research
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Researching Market Prices</h3>
        <p className="text-muted-foreground">
          Analyzing {photoGroups.length} items for optimal pricing...
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <DollarSign className="w-5 h-5 mr-2" />
            Research Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount + errorCount} of {photoGroups.length} completed</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            {isProcessing && currentIndex < photoGroups.length && (
              <p className="text-sm text-blue-600">
                Currently researching: {photoGroups[currentIndex]?.listingData?.title || 'Item'} 
                ({currentIndex + 1}/{photoGroups.length})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Item Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {progress.map((item, index) => {
              const group = photoGroups.find(g => g.id === item.groupId);
              return (
                <div key={item.groupId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {group?.listingData?.title || `Item ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeof group?.listingData?.category === 'object' && group.listingData.category
                          ? `${(group.listingData.category as any).primary}${(group.listingData.category as any).subcategory ? ` > ${(group.listingData.category as any).subcategory}` : ''}` 
                          : group?.listingData?.category || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {item.status === 'completed' && item.researchedPrice && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground line-through">
                          ${item.originalPrice?.toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          ${item.researchedPrice.toFixed(2)}
                        </span>
                        {getConfidenceBadge(item.confidence)}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs text-red-600">{item.error}</span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-xs text-muted-foreground">Waiting...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {completedCount > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Prices Updated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Research Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(overallProgress)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Continue button - show when processing is done OR when all items failed */}
      {(!isProcessing && (overallProgress === 100 || (errorCount > 0 && completedCount + errorCount === photoGroups.length))) && (
        <div className="text-center space-y-3">
          {completedCount > 0 ? (
            <Button onClick={() => onComplete(completedGroups)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue to Review ({completedCount} prices updated)
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Price research failed for all items. You can continue with manual pricing.
              </p>
              <Button onClick={() => onComplete(photoGroups)} className="bg-blue-600 hover:bg-blue-700">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue Without Prices
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkPriceResearchStep;
