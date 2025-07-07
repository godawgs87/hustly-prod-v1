
import { useBulkGroupingHandlers } from './useBulkGroupingHandlers';
import { useBulkOperations } from './handlers/useBulkOperations';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { useToast } from '@/hooks/use-toast';
import type { PhotoGroup } from '../BulkUploadManager';

type StepType = 'upload' | 'grouping' | 'review';

export const useBulkUploadHandlers = (
  photos: File[],
  photoGroups: PhotoGroup[],
  setIsGrouping: (loading: boolean) => void,
  setCurrentStep: (step: StepType) => void,
  setPhotoGroups: (groups: PhotoGroup[] | ((prev: PhotoGroup[]) => PhotoGroup[])) => void,
  onComplete: (results: any[]) => void
) => {
  const { toast } = useToast();
  const { analyzePhotos, isAnalyzing } = usePhotoAnalysis();

  // Grouping handlers
  const { handleStartGrouping, handleGroupsConfirmed } = useBulkGroupingHandlers(
    photos,
    setIsGrouping,
    setCurrentStep,
    setPhotoGroups
  );

  // Bulk operations
  const { postSingleItem } = useBulkOperations();

  const handleEditItem = (groupId: string) => {
    console.log('Edit item:', groupId);
  };

  const handlePreviewItem = (groupId: string) => {
    console.log('Preview item:', groupId);
  };

  const handlePostItem = async (groupId: string) => {
    const group = photoGroups.find(g => g.id === groupId);
    if (group) {
      const result = await postSingleItem(group);
      if (result.success) {
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId ? { ...g, isPosted: true, listingId: result.listingId } : g
        ));
      }
    }
  };

  const handlePostAll = async () => {
    const readyGroups = photoGroups.filter(g => g.status === 'completed' && g.selectedShipping && !g.isPosted);
    for (const group of readyGroups) {
      await handlePostItem(group.id);
    }
  };

  const handleUpdateGroup = (updatedGroup: PhotoGroup) => {
    setPhotoGroups(prev => prev.map(g => 
      g.id === updatedGroup.id ? updatedGroup : g
    ));
  };

  const handleRetryAnalysis = async (groupId: string) => {
    const group = photoGroups.find(g => g.id === groupId);
    if (!group) return;

    console.log('🤖 Starting real AI analysis for group:', groupId);
    
    // Set status to processing
    setPhotoGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, status: 'processing' as const } : g
    ));

    try {
      // Call the real AI analysis service
      const analysisResult = await analyzePhotos(group.photos);
      
      if (analysisResult) {
        // Update the group with the AI analysis results
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId ? { 
            ...g, 
            status: 'completed' as const,
            listingData: analysisResult,
            confidence: 'high' as const,
            // Add shipping options
            shippingOptions: [
              {
                id: 'ground',
                name: 'USPS Ground Advantage',
                cost: 8.45,
                timeframe: '3-5 business days',
                recommended: true,
                description: 'Most economical shipping option'
              },
              {
                id: 'priority',
                name: 'USPS Priority Mail',
                cost: 12.68,
                timeframe: '1-3 business days', 
                recommended: false,
                description: 'Faster delivery with tracking'
              },
              {
                id: 'express',
                name: 'USPS Priority Express',
                cost: 25.95,
                timeframe: '1-2 business days',
                recommended: false,
                description: 'Fastest delivery option'
              }
            ]
          } : g
        ));

        toast({
          title: "AI Analysis Complete! 🎯",
          description: `Generated listing data for ${analysisResult.title}`,
        });
      } else {
        // Analysis failed
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId ? { ...g, status: 'error' as const } : g
        ));
        
        toast({
          title: "Analysis Failed",
          description: "Could not analyze photos. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Set status to error
      setPhotoGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, status: 'error' as const } : g
      ));
      
      toast({
        title: "Analysis Error",
        description: "Failed to analyze photos. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    handleStartGrouping,
    handleGroupsConfirmed,
    handleEditItem,
    handlePreviewItem,
    handlePostItem,
    handlePostAll,
    handleUpdateGroup,
    handleRetryAnalysis,
    isAnalyzing
  };
};
