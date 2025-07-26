import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { PhotoGroup } from '@/components/bulk-upload/BulkUploadManager';
import type { ListingData } from '@/types/CreateListing';

export type UnifiedUploadStep = 'photos' | 'grouping' | 'analysis' | 'price-research' | 'edit' | 'confirmation' | 'shipping' | 'finalReview';

interface UseUnifiedUploadFlowOptions {
  initialPhotos?: File[];
  mode: 'single' | 'bulk';
  onComplete: (results: any[]) => void;
  shippingCost?: number;
}

import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { useListingSave } from '@/hooks/useListingSave';

export function useUnifiedUploadFlow({ initialPhotos = [], mode, onComplete, shippingCost = 0 }: UseUnifiedUploadFlowOptions) {
  const { toast } = useToast();
  const { saveListing } = useListingSave();
  const [currentStep, setCurrentStepInternal] = useState<UnifiedUploadStep>(mode === 'bulk' ? 'photos' : 'photos');
  const [photos, setPhotos] = useState<File[]>(initialPhotos);
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Debug wrapper for setCurrentStep to trace all step transitions
  const setCurrentStep = useCallback((step: UnifiedUploadStep) => {
    console.log('🔍 setCurrentStep called - from:', currentStep, 'to:', step);
    console.trace('🔍 setCurrentStep call stack');
    
    // FORCE pricing step for single mode when going from edit to shipping
    if (mode === 'single' && currentStep === 'edit' && step === 'shipping') {
      console.log('🚨 INTERCEPTED: Single mode edit→shipping, forcing price-research instead');
      setCurrentStepInternal('price-research');
      return;
    }
    
    setCurrentStepInternal(step);
  }, [currentStep, mode]);

  // Grouping logic (skip for single)
  const groupPhotos = useCallback((files: File[]) => {
    if (mode === 'single') {
      const group: PhotoGroup = {
        id: `group-single-${Date.now()}`,
        photos: files,
        name: 'Single Item',
        confidence: 'high',
        status: 'pending',
        aiSuggestion: undefined,
      };
      setPhotoGroups([group]);
      setCurrentStep('analysis');
      return;
    }
    // Bulk grouping (reuse bulk logic, simple grouping by default)
    const groups: PhotoGroup[] = files.map((file, idx) => ({
      id: `group-${Date.now()}-${idx}`,
      photos: [file],
      name: `Item ${idx + 1}`,
      confidence: 'medium',
      status: 'pending',
      aiSuggestion: undefined,
    }));
    setPhotoGroups(groups);
    setCurrentStep('grouping');
  }, [mode]);

  // Use real AI analysis for all groups
  const { analyzePhotos } = usePhotoAnalysis();
  const analyzeGroups = useCallback(async () => {
    setIsAnalyzing(true);
    setPhotoGroups(prev => prev.map(g => ({ ...g, status: 'processing' as const })));
    // Capture a fresh copy of photoGroups after status update
    let freshGroups: PhotoGroup[] = [];
    setPhotoGroups(prev => {
      freshGroups = prev;
      return prev;
    });
    await Promise.all(freshGroups.map(async (group, i) => {
      try {
        const aiResult = await analyzePhotos(group.photos);
        if (aiResult) {
          setPhotoGroups(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'completed' as const, listingData: aiResult } : g));
          
          // Auto-save as draft after AI analysis (single listing mode)
          if (mode === 'single' && aiResult) {
            try {
              const saveResult = await saveListing(aiResult, 0, 'draft');
              if (saveResult.success && saveResult.listingId) {
                setDraftId(saveResult.listingId);
                console.log('✅ Auto-saved listing as draft:', saveResult.listingId);
              }
            } catch (error) {
              console.error('❌ Auto-save failed:', error);
            }
          }
        } else {
          setPhotoGroups(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'error' as const } : g));
        }
      } catch (error) {
        setPhotoGroups(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'error' as const } : g));
      }
    }));
    setIsAnalyzing(false);
    setCurrentStep(mode === 'single' ? 'analysis' : 'confirmation');
    toast({ 
      title: 'AI Analysis Complete', 
      description: mode === 'single' ? 'Review your listing and pricing.' : 'Review and confirm your items.' 
    });
  }, [toast, analyzePhotos, mode, saveListing, setDraftId]);

  // Edit step (for single listing mode)
  const editItem = useCallback((updatedData: ListingData) => {
    setPhotoGroups(prev => prev.map(g => ({ ...g, listingData: updatedData })));
  }, []);

  // Price research handlers
  const handlePriceResearchComplete = useCallback((priceData: any, suggestedPrice?: number) => {
    if (suggestedPrice && photoGroups.length > 0) {
      // Update the listing data with the suggested price
      setPhotoGroups(prev => prev.map(g => ({
        ...g,
        listingData: g.listingData ? { ...g.listingData, price: suggestedPrice } : g.listingData
      })));
    }
    setCurrentStep('edit');
    toast({ 
      title: 'Price Research Complete', 
      description: suggestedPrice ? `Suggested price: $${suggestedPrice}` : 'Review and edit your listing.' 
    });
  }, [photoGroups, toast]);

  const handleSkipPriceResearch = useCallback(() => {
    setCurrentStep('edit');
    toast({ 
      title: 'Price Research Skipped', 
      description: 'You can set your own price in the edit step.' 
    });
  }, [toast]);

  // Confirm edit (move to price-research for single mode, shipping for bulk)
  const confirmEdit = useCallback(() => {
    console.log('📝 confirmEdit called - mode:', mode);
    console.log('📝 confirmEdit - current step before:', currentStep);
    if (mode === 'single') {
      console.log('📝 Single mode: going to price-research');
      setCurrentStep('price-research');
    } else {
      console.log('📝 Bulk mode: going to shipping');
      setCurrentStep('shipping');
    }
    console.log('📝 confirmEdit - current step after:', currentStep);
  }, [mode, currentStep]);

  // Confirm items (move to shipping)
  const confirmItems = useCallback(() => {
    setCurrentStep('shipping');
  }, []);

  // Confirm shipping (move to final review)
  const confirmShipping = useCallback(() => {
    setCurrentStep('finalReview');
  }, []);

  // Post all items (update draft to active)
  const postAll = useCallback(async () => {
    if (mode === 'single' && draftId && photoGroups[0]?.listingData) {
      // Single listing: update existing draft to active
      try {
        const result = await saveListing(
          photoGroups[0].listingData as any, 
          shippingCost, 
          'active', 
          draftId
        );
        if (result.success) {
          setPhotoGroups(prev => prev.map((g, idx) => idx === 0 ? { ...g, isPosted: true, listingId: result.listingId } : g));
          toast({ title: 'Listing Published', description: 'Your item has been published successfully.' });
        } else {
          throw new Error('Failed to publish listing');
        }
      } catch (error) {
        console.error('❌ Failed to publish listing:', error);
        toast({ title: 'Error', description: 'Failed to publish listing. Please try again.', variant: 'destructive' });
        return;
      }
    } else {
      // Bulk upload: save all items as active
      await Promise.all(photoGroups.map(async (group, i) => {
        if (group.listingData) {
          try {
            const result = await saveListing(
              group.listingData as any,
              shippingCost, 
              'active'
            );
            if (result.success) {
              setPhotoGroups(prev => prev.map((g, idx) => idx === i ? { ...g, isPosted: true, listingId: result.listingId } : g));
            }
          } catch (error) {
            console.error(`❌ Failed to save item ${i}:`, error);
          }
        }
      }));
      toast({ title: 'All Items Posted', description: `${photoGroups.length} items posted successfully.` });
    }
    onComplete(photoGroups);
  }, [photoGroups, toast, onComplete, mode, draftId, saveListing]);

  return {
    currentStep,
    setCurrentStep,
    photos,
    setPhotos,
    photoGroups,
    setPhotoGroups,
    isGrouping,
    setIsGrouping,
    isAnalyzing,
    groupPhotos,
    analyzeGroups,
    editItem,
    confirmEdit,
    confirmItems,
    confirmShipping,
    postAll,
    draftId,
    handlePriceResearchComplete,
    handleSkipPriceResearch,
  };
}
