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
import { EbayService } from '@/services/api/ebayService';
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
  priceData?: any;
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
        keywords: aiResult.keywords || [group.name.toLowerCase()],
        measurements: aiResult.measurements || {}
      };

      // Update group data with AI results FIRST
      const updatedGroupData = {
        ...group,
        listingData: {
          ...group.listingData,
          ...aiData,
          price: group.listingData?.price || 25 // Keep existing price or default
        },
        status: 'completed'
      };

      // Update state with new group data
      setCompletedGroups(prev => 
        prev.map(g => g.id === group.id ? updatedGroupData : g)
      );

      console.log('✅ AI Result:', aiData);

      // Auto-trigger price research with updated group data (no race condition)
      const hasValidTitle = aiData.title && 
                           aiData.title !== 'Needs Review - Listing Not Fully Generated' &&
                           aiData.title.trim().length > 0;

      if (isEbayConnected && hasValidTitle) {
        console.log('🚀 Auto-triggering price research for', group.name, 'with title:', aiData.title);
        
        // Force state synchronization before price research
        setTimeout(() => {
          console.log('🔄 Triggering price research after state sync for:', group.id);
          processPriceResearch(group.id, updatedGroupData);
        }, 100); // Minimal delay to ensure state update
      } else {
        console.log('⏸️ Skipping auto price research for', group.name, ':', {
          isEbayConnected,
          hasValidTitle,
          title: aiData.title
        });
      }

      updateProgress(group.id, { aiStatus: 'completed' });

      // Return the updated group data
      return updatedGroupData;
    } catch (error) {
      console.error('❌ Analysis failed for group:', group.name, error);
      
      // Create fallback data to prevent crashes
      const fallbackData = {
        title: `${group.name} - Manual Review Required`,
        description: 'AI analysis failed. Please edit this listing manually.',
        price: 25,
        category: 'Uncategorized',
        brand: 'Unknown',
        condition: 'Good',
        measurements: {}
      };
      
      // Update the group with fallback data so user can continue
      setCompletedGroups(prev => prev.map(g => 
        g.id === group.id 
          ? { ...g, listingData: fallbackData, status: 'completed' }
          : g
      ));
      
      updateProgress(group.id, { 
        aiStatus: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
      
      toast.error(`Analysis failed for ${group.name}. Fallback data created - please edit manually.`);
      
      // Return group with fallback data
      return {
        ...group,
        listingData: fallbackData
      };
    }
  };

  const processPriceResearch = async (groupId: string, updatedGroupData?: any) => {
    if (!isEbayConnected) {
      toast.error('eBay not connected. Please connect your eBay account in Settings to enable price research.');
      return;
    }

    updateProgress(groupId, { priceStatus: 'processing' });
    
    try {
      // Use updated group data if provided (from AI analysis), otherwise find existing group
      const group = updatedGroupData || 
                   completedGroups.find(g => g.id === groupId) || 
                   photoGroups.find(g => g.id === groupId);
      
      if (!group?.listingData?.title) {
        console.log('❌ No title available for price research, group data:', group);
        throw new Error('No title available for price research');
      }

      console.log('🔍 Starting price research for:', group.listingData.title);

      // Extract research parameters from AI analysis (same as single upload)
      const researchParams = EbayService.extractPriceResearchParams(group.listingData);
      
      // Perform price research (same as single upload)
      const result = await EbayService.researchItemPrice(researchParams);
      console.log('🔍 Price research result:', result);

      if (result.data) {
        const totalComps = result.data.searchResults?.total || 0;
        const suggestedPrice = result.data.priceAnalysis?.suggestedPrice || 0;
        
        console.log('💰 Found suggested price:', suggestedPrice, 'from', totalComps, 'comparables');

        // Auto-populate the price field with suggested price (same as single upload)
        if (suggestedPrice > 0) {
          console.log('💰 Updating price for group:', groupId, 'from', group.listingData?.price, 'to', suggestedPrice);
          
          const updatedGroup = {
            ...group,
            listingData: {
              ...group.listingData,
              price: suggestedPrice // Auto-fill the price field
            }
          };

          console.log('💰 Updated group data:', updatedGroup);

          // Update the group with the new price
          setCompletedGroups(prev => {
            const existingGroupIndex = prev.findIndex(g => g.id === groupId);
            let newGroups;
            
            if (existingGroupIndex >= 0) {
              // Update existing group
              newGroups = prev.map(g => g.id === groupId ? updatedGroup : g);
            } else {
              // Add new group if it doesn't exist
              newGroups = [...prev, updatedGroup];
            }
            
            console.log('💰 Updated completedGroups:', newGroups);
            return newGroups;
          });

          // Force UI re-render by updating progress state
          setProgress(prev => 
            prev.map(p => p.groupId === groupId ? { ...p, priceUpdated: Date.now() } : p)
          );

          toast.success(`Price research complete: $${suggestedPrice} (from ${totalComps} comparables)`);
        } else {
          toast.info('No exact matches found, keeping current price');
        }

        updateProgress(groupId, { 
          priceStatus: 'completed',
          priceData: result.data 
        });
      } else {
        throw new Error('No price data received');
      }
    } catch (error: any) {
      console.error('❌ Price research failed:', error);
      
      // Enhanced error handling for eBay token issues
      if (error.message?.includes('invalid_scope') || error.message?.includes('token')) {
        toast.error('eBay connection expired. Please reconnect your eBay account in Settings.');
      } else {
        toast.error(`Price research failed: ${error.message}`);
      }
      
      updateProgress(groupId, { priceStatus: 'error' });
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
        
        // Update completedGroups immediately BEFORE any price research triggers
        setCompletedGroups(prev => {
          const newGroups = [...prev, processedGroup];
          console.log('🔄 Updated completedGroups immediately:', newGroups.length, 'groups');
          return newGroups;
        });
      }
      
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
                  <th className="text-left p-3 font-medium">Measurements</th>
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
                      
                      {/* Measurements */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {displayGroup.listingData?.measurements && Object.keys(displayGroup.listingData.measurements).length > 0
                            ? Object.entries(displayGroup.listingData.measurements)
                                .filter(([key, value]) => value && value !== '')
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')
                            : '-'
                          }
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
                            const shouldShow = groupProgress?.aiStatus === 'completed' && 
                                             isEbayConnected && 
                                             groupProgress?.priceStatus !== 'completed';
                            console.log(`🔍 Price Research Button Debug for ${group.id}:`, {
                              aiStatus: groupProgress?.aiStatus,
                              priceStatus: groupProgress?.priceStatus,
                              shouldShow: shouldShow,
                              isEbayConnected,
                              ebayConnection
                            });
                            
                            return shouldShow ? (
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
