import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Brain, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Edit, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight,
  Search
} from 'lucide-react';
import { PhotoGroup } from '@/types/bulk-upload';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { validateEbayConnection } from '@/utils/ebayConnectionValidator';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';

interface BulkCombinedAnalysisStepProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithData: PhotoGroup[]) => void;
  onBack: () => void;
}

interface GroupProgress {
  groupId: string;
  aiStatus: 'pending' | 'processing' | 'completed' | 'error';
  priceStatus: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const BulkCombinedAnalysisStep: React.FC<BulkCombinedAnalysisStepProps> = ({
  photoGroups,
  onComplete,
  onBack
}) => {
  const [progress, setProgress] = useState<GroupProgress[]>([]);
  const [completedGroups, setCompletedGroups] = useState<PhotoGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { analyzePhotos } = usePhotoAnalysis();
  const { user } = useAuth();

  // Check eBay connection with proper validation
  const { data: ebayConnection, isLoading: isCheckingEbay } = useQuery({
    queryKey: ['ebay-connection-status', user?.id],
    queryFn: validateEbayConnection,
    enabled: !!user,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  const isEbayConnected = ebayConnection?.isConnected && ebayConnection?.isTokenValid;

  // Initialize progress for all groups
  useEffect(() => {
    const initialProgress = photoGroups.map(group => ({
      groupId: group.id,
      aiStatus: 'pending' as const,
      priceStatus: 'pending' as const
    }));
    setProgress(initialProgress);
  }, [photoGroups]);

  const updateProgress = (groupId: string, updates: Partial<GroupProgress>) => {
    setProgress(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, ...updates } : p
    ));
  };

  const processGroupAnalysis = async (group: PhotoGroup) => {
    try {
      console.log('🔍 Processing group:', group.name);
      
      // Call real AI analysis
      const aiResult = await analyzePhotos(group.photos);
      console.log('✅ AI Result:', aiResult);

      // Convert category object to string to prevent React error #31
      const aiData = {
        title: aiResult.title || `${group.name} - Premium Quality`,
        description: aiResult.description || `High-quality ${group.name.toLowerCase()} in excellent condition.`,
        category: typeof aiResult.category === 'object' && aiResult.category
          ? `${(aiResult.category as any).primary}${(aiResult.category as any).subcategory ? ' > ' + (aiResult.category as any).subcategory : ''}`
          : aiResult.category || 'Clothing, Shoes & Accessories',
        condition: aiResult.condition || 'Used',
        keywords: aiResult.keywords || [group.name.toLowerCase()]
      };

      updateProgress(group.id, { aiStatus: 'completed' });

      return {
        ...group,
        listingData: {
          ...group.listingData,
          ...aiData,
          price: group.listingData?.price || 25
        }
      };
    } catch (error) {
      console.error('❌ Analysis failed for group:', group.name, error);
      updateProgress(group.id, { 
        aiStatus: 'error', 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      });
      
      toast.error(`Analysis failed for ${group.name}. Using defaults.`);
      
      // Return group with default data
      return {
        ...group,
        listingData: {
          ...group.listingData,
          title: group.listingData?.title || `${group.name} - Premium Quality`,
          description: group.listingData?.description || `High-quality ${group.name.toLowerCase()} in excellent condition.`,
          category: group.listingData?.category || 'Clothing, Shoes & Accessories',
          condition: group.listingData?.condition || 'Used',
          keywords: group.listingData?.keywords || [group.name.toLowerCase()],
          price: group.listingData?.price || 25
        }
      };
    }
  };

  const processPriceResearch = async (groupId: string) => {
    if (!isEbayConnected) {
      toast.error('eBay not connected. Please connect your eBay account in Settings to enable price research.');
      return;
    }

    updateProgress(groupId, { priceStatus: 'processing' });
    
    try {
      const group = completedGroups.find(g => g.id === groupId) || photoGroups.find(g => g.id === groupId);
      if (!group?.listingData?.title) {
        throw new Error('No title available for price research');
      }

      // Call price research API (you'll need to implement this)
      const response = await fetch('/api/price-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: group.listingData.title,
          category: group.listingData.category,
          condition: group.listingData.condition
        })
      });

      if (!response.ok) throw new Error('Price research failed');
      
      const priceData = await response.json();
      
      // Update the group with price research data
      setCompletedGroups(prev => prev.map(g => 
        g.id === groupId 
          ? {
              ...g,
              listingData: {
                ...g.listingData,
                price: priceData.suggestedPrice || g.listingData?.price || 25,
                priceResearch: priceData
              }
            }
          : g
      ));

      updateProgress(groupId, { priceStatus: 'completed' });
      toast.success(`Price research completed for ${group.name}`);
      
    } catch (error) {
      console.error('❌ Price research failed:', error);
      updateProgress(groupId, { 
        priceStatus: 'error',
        error: error instanceof Error ? error.message : 'Price research failed'
      });
      toast.error('Price research failed. You can set prices manually.');
    }
  };

  const startAnalysis = async () => {
    setAnalysisStarted(true);
    setIsProcessing(true);
    
    try {
      const processedGroups = [];
      
      for (let i = 0; i < photoGroups.length; i++) {
        setCurrentIndex(i);
        updateProgress(photoGroups[i].id, { aiStatus: 'processing' });
        
        const processedGroup = await processGroupAnalysis(photoGroups[i]);
        processedGroups.push(processedGroup);
      }
      
      setCompletedGroups(processedGroups);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Analysis process failed:', error);
      setIsProcessing(false);
      toast.error('Analysis process failed. Please try again.');
    }
  };

  const handleContinueToShipping = () => {
    onComplete(completedGroups.length > 0 ? completedGroups : photoGroups);
  };

  const handleBackToGrouping = () => {
    onBack();
  };

  const getProgressText = () => {
    if (!analysisStarted) return 'Ready to analyze';
    if (isProcessing) return `Processing item ${currentIndex + 1} of ${photoGroups.length}`;
    const completedCount = progress.filter(p => p.aiStatus === 'completed').length;
    return `Analysis complete (${completedCount}/${photoGroups.length})`;
  };

  const handleFieldEdit = (groupId: string, field: string, value: any) => {
    setCompletedGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            listingData: {
              ...group.listingData,
              [field]: value
            }
          }
        : group
    ));
  };

  const overallProgress = photoGroups.length > 0 
    ? Math.round(((currentIndex + (isProcessing ? 0 : 1)) / photoGroups.length) * 100)
    : 0;

  const allCompleted = progress.length > 0 && progress.every(p => p.aiStatus === 'completed' || p.aiStatus === 'error');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
          <Brain className="w-6 h-6 text-blue-600" />
          <DollarSign className="w-6 h-6 text-green-600" />
          AI Analysis & Price Research
        </h2>
        <p className="text-gray-600">
          Review your {photoGroups.length} items - Click "Start Analysis" when ready
        </p>
      </div>

      {/* Top Action Buttons - Moved for better visibility */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline" 
          onClick={handleBackToGrouping}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photo Grouping
        </Button>
        
        {(allCompleted || analysisStarted) && (
          <Button 
            onClick={handleContinueToShipping}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-lg font-semibold"
          >
            Continue to Shipping Configuration
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress Status */}
      {analysisStarted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium">{getProgressText()}</span>
            </div>
            <Progress value={overallProgress} className="w-32" />
          </div>
        </div>
      )}

      {/* ITEMS TABLE - ALWAYS VISIBLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Review & Edit Items ({photoGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {photoGroups.map((group, index) => {
                  const groupProgress = progress.find(p => p.groupId === group.id);
                  const isEditing = editingGroup === group.id;
                  const completedGroup = completedGroups.find(cg => cg.id === group.id);
                  const displayGroup = completedGroup || group;
                  
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      {/* Item - Title + Thumbnail */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {group.photos && group.photos.length > 0 ? (
                              <img 
                                src={URL.createObjectURL(group.photos[0])} 
                                alt={displayGroup.listingData?.title || group.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                          </div>
                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={displayGroup.listingData?.title || group.name}>
                              {displayGroup.listingData?.title || group.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {group.photos?.length || 0} photo{group.photos?.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {groupProgress?.aiStatus === 'completed' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          ) : groupProgress?.aiStatus === 'processing' ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          
                          {/* Price Research Status */}
                          {groupProgress?.priceStatus === 'completed' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <DollarSign className="w-3 h-3 mr-1" />
                              Price
                            </Badge>
                          )}
                          {groupProgress?.priceStatus === 'processing' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Pricing
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      {/* Title */}
                      <td className="p-3">
                        {isEditing ? (
                          <Input
                            value={displayGroup.listingData?.title || ''}
                            onChange={(e) => handleFieldEdit(group.id, 'title', e.target.value)}
                            className="text-sm"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {displayGroup.listingData?.title || group.name}
                          </span>
                        )}
                      </td>
                      
                      {/* Price */}
                      <td className="p-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={displayGroup.listingData?.price || ''}
                            onChange={(e) => handleFieldEdit(group.id, 'price', parseFloat(e.target.value) || 0)}
                            className="text-sm w-20"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            ${displayGroup.listingData?.price || 25}
                          </span>
                        )}
                      </td>
                      
                      {/* Category */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {displayGroup.listingData?.category || 'Clothing, Shoes & Accessories'}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGroup(isEditing ? null : group.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Price Research Button - Enhanced with debugging */}
                          {(() => {
                            const shouldShowPriceButton = groupProgress?.aiStatus === 'completed' && groupProgress?.priceStatus !== 'completed';
                            console.log(`🔍 Price Research Button Debug for ${group.id}:`, {
                              aiStatus: groupProgress?.aiStatus,
                              priceStatus: groupProgress?.priceStatus,
                              shouldShow: shouldShowPriceButton,
                              isEbayConnected,
                              ebayConnection
                            });
                            
                            return shouldShowPriceButton ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => processPriceResearch(group.id)}
                                disabled={groupProgress?.priceStatus === 'processing'}
                                title={isEbayConnected ? 'Run Price Research' : 'eBay not connected'}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-white"
                              >
                                {groupProgress?.priceStatus === 'processing' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Search className="w-4 h-4" />
                                )}
                              </Button>
                            ) : (
                              <div className="text-xs text-gray-400 px-2">
                                {groupProgress?.aiStatus !== 'completed' ? 'AI pending' : 'Price done'}
                              </div>
                            );
                          })()}
                          {groupProgress?.error && (
                            <div title={groupProgress.error}>
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Start Analysis Button - Center when not started */}
      {!analysisStarted && (
        <div className="flex justify-center pt-6">
          <Button 
            onClick={startAnalysis}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-semibold"
          >
            <Brain className="w-4 h-4" />
            Start Analysis
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkCombinedAnalysisStep;
