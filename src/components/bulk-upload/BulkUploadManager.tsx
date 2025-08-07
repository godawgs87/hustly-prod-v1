import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import BulkUploadHeader from './components/BulkUploadHeader';
import BulkUploadStepIndicator from './components/BulkUploadStepIndicator';
import type { StepType } from './components/BulkUploadStepRenderer';
import BulkUploadStepRenderer from './components/BulkUploadStepRenderer';
import { useBulkUploadState } from './hooks/useBulkUploadState';
import { useBulkUploadHandlers } from './hooks/useBulkUploadHandlers';
import EnhancedPreviewDialog from './components/EnhancedPreviewDialog';

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
    ebay_category_id?: string;
    ebay_category_path?: string;
    mercari_category_id?: string;
    mercari_category_path?: string;
    poshmark_category_id?: string;
    poshmark_category_path?: string;
    depop_category_id?: string;
    depop_category_path?: string;
    facebook_category_id?: string;
    facebook_category_path?: string;
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

interface BulkUploadManagerProps {
  onComplete: (results: any[]) => void;
  onBack: () => void;
  onViewInventory?: () => void;
}

const BulkUploadManager = ({ onComplete, onBack, onViewInventory }: BulkUploadManagerProps) => {
  const { toast } = useToast();
  const state = useBulkUploadState();
  
  // Preview dialog state
  const [previewGroup, setPreviewGroup] = useState<PhotoGroup | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Price research state
  const [isPriceResearching, setIsPriceResearching] = useState(false);

  const handlePhotosUploaded = useCallback((uploadedPhotos: File[]) => {
    state.setPhotos(uploadedPhotos);
  }, [state.setPhotos]);

  const handleCategoriesComplete = useCallback((groupsWithCategories: PhotoGroup[]) => {
    state.setPhotoGroups(groupsWithCategories);
    state.setCurrentStep('shipping');
  }, [state.setPhotoGroups, state.setCurrentStep]);

  const handleShippingComplete = useCallback((groupsWithShipping: PhotoGroup[]) => {
    state.setPhotoGroups(groupsWithShipping);
    state.setCurrentStep('finalReview');
    toast({
      title: "Shipping configured!",
      description: "Review your items before final submission.",
    });
  }, [state.setPhotoGroups, state.setCurrentStep, toast]);

  const handleViewInventory = useCallback(() => {
    if (onViewInventory) {
      onViewInventory();
    }
  }, [onViewInventory]);

  const handleProceedToShipping = useCallback(() => {
    // Check if items have price research data (indicating price research was completed)
    const hasPriceResearch = state.photoGroups.some(g => 
      g.status === 'completed' && 
      g.listingData?.priceResearch && 
      g.listingData.priceResearch !== 'null' && 
      g.listingData.priceResearch !== ''
    );
    
    if (hasPriceResearch) {
      // Price research is complete, proceed to shipping
      state.setCurrentStep('shipping');
      toast({
        title: "Proceeding to Shipping",
        description: "Configure shipping options for your items.",
      });
    } else {
      // Price research not done yet, go to combined analysis
      state.setCurrentStep('combinedAnalysis');
      toast({
        title: "Review & Price Research",
        description: "Review AI analysis and run price research for your items.",
      });
    }
  }, [state.setCurrentStep, state.photoGroups, toast]);

  const handleStartPriceResearch = useCallback(() => {
    setIsPriceResearching(true);
    state.setCurrentStep('combinedAnalysis');
    toast({
      title: "Review & Price Research",
      description: "Review AI analysis and run price research for your items.",
    });
  }, [state.setCurrentStep, toast]);

  const handlePriceResearchComplete = useCallback((groupsWithPrices: PhotoGroup[]) => {
    state.setPhotoGroups(groupsWithPrices);
    setIsPriceResearching(false);
    state.setCurrentStep('combinedAnalysis'); // Return to combined analysis with updated prices
    toast({
      title: "Price Research Complete!",
      description: "Market prices have been researched and applied to your items. Review and continue to shipping.",
    });
  }, [state.setPhotoGroups, state.setCurrentStep, toast]);

  const handlePreviewItem = useCallback((groupId: string) => {
    const group = state.photoGroups.find(g => g.id === groupId);
    if (group) {
      setPreviewGroup(group);
      setIsPreviewOpen(true);
    }
  }, [state.photoGroups]);

  const handlePreviewSave = useCallback((updatedGroup: PhotoGroup) => {
    state.setPhotoGroups(prev => prev.map(g => 
      g.id === updatedGroup.id ? updatedGroup : g
    ));
    setIsPreviewOpen(false);
  }, [state.setPhotoGroups]);

  const handleEditItem = useCallback((groupId: string) => {
    console.log('Edit item:', groupId);
    // Edit functionality will be handled by the review dashboard
  }, []);

  const handlers = useBulkUploadHandlers(
    state.photos,
    state.photoGroups,
    state.setIsGrouping,
    state.setCurrentStep,
    state.setPhotoGroups,
    onComplete,
    handleEditItem,
    handlePreviewItem
  );

  useEffect(() => {
    const toastElements = document.querySelectorAll('[data-sonner-toast]');
    toastElements.forEach(el => el.remove());
  }, [state.currentStep]);

  const stepRendererProps = useMemo(() => ({
    currentStep: state.currentStep as any,
    photos: state.photos,
    photoGroups: state.photoGroups,
    isGrouping: state.isGrouping,
    isAnalyzing: handlers.isAnalyzing,
    onPhotosUploaded: handlePhotosUploaded,
    onStartGrouping: handlers.handleStartGrouping,
    onGroupsConfirmed: handlers.handleGroupsConfirmed,
    onEditItem: handlers.handleEditItem,
    onPreviewItem: handlePreviewItem,
    onPostItem: handlers.handlePostItem,
    onPostAll: handlers.handlePostAll,
    onUpdateGroup: handlers.handleUpdateGroup,
    onRetryAnalysis: handlers.handleRetryAnalysis,
    onRunAI: handlers.handleRetryAnalysis,
    onBack: () => handlers.handleBack('upload'),
    onCategoriesComplete: handleCategoriesComplete,
    onShippingComplete: handleShippingComplete,
    onViewInventory: handleViewInventory,
    onStepChange: (step: StepType) => state.setCurrentStep(step as any),
    onStartAnalysis: handlers.handleStartAnalysis,
    onStartBulkAnalysis: handlers.handleStartAnalysis,
    onProceedToShipping: handleProceedToShipping,
    onStartPriceResearch: handleStartPriceResearch,
    onPriceResearchComplete: handlePriceResearchComplete,
    isPriceResearching: isPriceResearching,
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
    handlePreviewItem,
    handlers.handlePostItem,
    handlers.handlePostAll,
    handlers.handleUpdateGroup,
    handlers.handleRetryAnalysis,
    handlers.handleBack,
    handleCategoriesComplete,
    handleShippingComplete,
    handleViewInventory,
    state.setCurrentStep,
    handlers.handleStartAnalysis,
    handleProceedToShipping,
    handleStartPriceResearch,
    handlePriceResearchComplete,
    isPriceResearching,
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
      
      {/* Preview Dialog */}
      <EnhancedPreviewDialog
        group={previewGroup}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSave={handlePreviewSave}
      />
    </div>
  );
};

export default BulkUploadManager;
