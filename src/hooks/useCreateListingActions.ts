
import { useEffect, useRef } from 'react';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { useListingSave } from '@/hooks/useListingSave';
import { ListingData } from '@/types/CreateListing';

interface UseCreateListingActionsProps {
  photos: File[];
  listingData: ListingData | null;
  shippingCost: number;
  draftId: string | null;
  isAutoSaving: boolean;
  setListingData: (data: ListingData | null) => void;
  setDraftId: (id: string | null) => void;
  setIsAutoSaving: (saving: boolean) => void;
  setCurrentStep: (step: any) => void;
  onViewListings: () => void;
}

export const useCreateListingActions = ({
  photos,
  listingData,
  shippingCost,
  draftId,
  isAutoSaving,
  setListingData,
  setDraftId,
  setIsAutoSaving,
  setCurrentStep,
  onViewListings
}: UseCreateListingActionsProps) => {
  const { analyzePhotos, isAnalyzing } = usePhotoAnalysis();
  const { saveListing, isSaving } = useListingSave();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Auto-save draft with proper cleanup
  useEffect(() => {
    if (!listingData || isAnalyzing || isSaving || isAutoSaving || !mountedRef.current) {
      return;
    }
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      setIsAutoSaving(true);
      
      try {
        const saveResult = await saveListing(listingData, shippingCost, 'draft', draftId || undefined);
        if (saveResult.success && saveResult.listingId && !draftId && mountedRef.current) {
          setDraftId(saveResult.listingId);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        if (mountedRef.current) {
          setIsAutoSaving(false);
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [listingData, shippingCost, draftId, isAnalyzing, isSaving, isAutoSaving, saveListing, setDraftId, setIsAutoSaving]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleAnalyze = async () => {
    if (photos.length === 0 || !mountedRef.current) return;
    
    try {
      const result = await analyzePhotos(photos);
      if (result && mountedRef.current) {
        const enrichedResult = {
          ...result,
          is_consignment: listingData?.is_consignment || false,
          consignment_percentage: listingData?.consignment_percentage,
          consignor_name: listingData?.consignor_name,
          consignor_contact: listingData?.consignor_contact,
          purchase_price: listingData?.purchase_price,
          purchase_date: listingData?.purchase_date,
          source_location: listingData?.source_location,
          source_type: listingData?.source_type
        };
        
        setListingData(enrichedResult);
        setCurrentStep('preview');
      }
    } catch (error) {
      console.error('Photo analysis failed:', error);
    }
  };

  const handleExport = async () => {
    if (!listingData || !mountedRef.current) return;
    
    try {
      const success = await saveListing(listingData, shippingCost, 'active', draftId || undefined);
      if (success.success && mountedRef.current) {
        onViewListings();
      }
    } catch (error) {
      console.error('Error publishing listing:', error);
    }
  };

  return {
    handleAnalyze,
    handleExport,
    isAnalyzing,
    isSaving: isSaving || isAutoSaving
  };
};
