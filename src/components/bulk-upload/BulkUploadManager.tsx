
import React, { useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import BulkUploadHeader from './components/BulkUploadHeader';
import BulkUploadStepIndicator from './components/BulkUploadStepIndicator';
import BulkUploadStepRenderer from './components/BulkUploadStepRenderer';
import { useBulkUploadState } from './hooks/useBulkUploadState';
import { useBulkUploadHandlers } from './hooks/useBulkUploadHandlers';

export interface PhotoGroup {
  id: string;
  photos: File[];
  name: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'error';
  aiSuggestion?: string;
  listingData?: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    category_id?: string | null;
    condition?: string;
    measurements?: {
      length?: string | number;
      width?: string | number;
      height?: string | number;
      weight?: string | number;
    };
    keywords?: string[];
    photos?: string[];
    priceResearch?: string;
    purchase_price?: number;
    purchase_date?: string;
    source_location?: string;
    source_type?: string;
    is_consignment?: boolean;
    consignment_percentage?: number;
    consignor_name?: string;
    consignor_contact?: string;
    clothing_size?: string;
    shoe_size?: string;
    gender?: 'Men' | 'Women' | 'Kids' | 'Unisex';
    age_group?: 'Adult' | 'Youth' | 'Toddler' | 'Baby';
    features?: string[];
    includes?: string[];
    defects?: string[];
  };
  shippingOptions?: any[];
  selectedShipping?: {
    id: string;
    name: string;
    cost: number;
    estimatedDays: string;
  };
  isPosted?: boolean;
  listingId?: string;
}

type StepType = 'upload' | 'grouping' | 'review' | 'shipping';

interface BulkUploadManagerProps {
  onComplete: (results: any[]) => void;
  onBack: () => void;
  onViewInventory?: () => void;
}

const BulkUploadManager = ({ onComplete, onBack, onViewInventory }: BulkUploadManagerProps) => {
  const { toast } = useToast();
  const state = useBulkUploadState();
  const handlers = useBulkUploadHandlers(
    state.photos,
    state.photoGroups,
    state.setIsGrouping,
    state.setCurrentStep,
    state.setPhotoGroups,
    onComplete
  );

  // Clear toasts only when step changes, not on every render
  useEffect(() => {
    const toastElements = document.querySelectorAll('[data-sonner-toast]');
    toastElements.forEach(el => el.remove());
  }, [state.currentStep]);

  const handlePhotosUploaded = useCallback((uploadedPhotos: File[]) => {
    console.log('📸 Photos uploaded for bulk processing:', uploadedPhotos.length);
    state.setPhotos(uploadedPhotos);
  }, [state.setPhotos]);

  const handleShippingComplete = useCallback((groupsWithShipping: PhotoGroup[]) => {
    state.setPhotoGroups(groupsWithShipping);
    state.setCurrentStep('review');
    
    toast({
      title: "Shipping configured!",
      description: "Items are now ready for posting to marketplace.",
    });
  }, [state.setPhotoGroups, state.setCurrentStep, toast]);

  const handleViewInventory = useCallback(() => {
    if (onViewInventory) {
      onViewInventory();
    }
  }, [onViewInventory]);

  // Memoize the step renderer props to prevent unnecessary re-renders
  const stepRendererProps = useMemo(() => ({
    currentStep: state.currentStep,
    photos: state.photos,
    photoGroups: state.photoGroups,
    isGrouping: state.isGrouping,
    isAnalyzing: handlers.isAnalyzing,
    onPhotosUploaded: handlePhotosUploaded,
    onStartGrouping: handlers.handleStartGrouping,
    onGroupsConfirmed: handlers.handleGroupsConfirmed,
    onEditItem: handlers.handleEditItem,
    onPreviewItem: handlers.handlePreviewItem,
    onPostItem: handlers.handlePostItem,
    onPostAll: handlers.handlePostAll,
    onUpdateGroup: handlers.handleUpdateGroup,
    onRetryAnalysis: handlers.handleRetryAnalysis,
    onShippingComplete: handleShippingComplete,
    onViewInventory: handleViewInventory,
    onBack,
    onStepChange: state.setCurrentStep
  }), [
    state.currentStep,
    state.photos,
    state.photoGroups,
    state.isGrouping,
    handlers.isAnalyzing,
    handlePhotosUploaded,
    handlers.handleStartGrouping,
    handlers.handleGroupsConfirmed,
    handlers.handleEditItem,
    handlers.handlePreviewItem,
    handlers.handlePostItem,
    handlers.handlePostAll,
    handlers.handleUpdateGroup,
    handlers.handleRetryAnalysis,
    handleShippingComplete,
    handleViewInventory,
    onBack,
    state.setCurrentStep
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <BulkUploadHeader />
      
      <BulkUploadStepIndicator
        currentStep={state.currentStep}
        photos={state.photos}
        photoGroups={state.photoGroups}
        processingResults={[]}
      />

      <BulkUploadStepRenderer {...stepRendererProps} />
    </div>
  );
};

export default BulkUploadManager;
