
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import { useCreateListingState } from '@/hooks/useCreateListingState';
import { useCreateListingActions } from '@/hooks/useCreateListingActions';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import CreateListingContent from '@/components/create-listing/CreateListingContent';
import CreateListingSteps from '@/components/create-listing/CreateListingSteps';
import BulkUploadManager from '@/components/bulk-upload/BulkUploadManager';
import CreateListingModeSelector from '@/components/create-listing/CreateListingModeSelector';

interface CreateListingProps {
  onBack: () => void;
  onViewListings: () => void;
}

const CreateListing = ({ onBack, onViewListings }: CreateListingProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk' | null>(null);
  
  const state = useCreateListingState();
  const actions = useCreateListingActions({
    photos: state.photos,
    listingData: state.listingData,
    shippingCost: state.shippingCost,
    draftId: state.draftId,
    isAutoSaving: state.isAutoSaving,
    setListingData: state.setListingData,
    setDraftId: state.setDraftId,
    setIsAutoSaving: state.setIsAutoSaving,
    setCurrentStep: state.setCurrentStep,
    onViewListings: () => window.location.href = '/inventory'
  });

  const handleEdit = () => {
    state.setCurrentStep('shipping');
  };

  const handleBack = () => {
    if (uploadMode === null) {
      onBack();
    } else if (uploadMode === 'single') {
      if (state.currentStep === 'shipping') {
        state.setCurrentStep('preview');
      } else if (state.currentStep === 'preview') {
        state.setCurrentStep('photos');
      } else {
        setUploadMode(null);
      }
    } else {
      setUploadMode(null);
    }
  };

  const handleBulkComplete = (results: any[]) => {
    console.log('Bulk upload completed with results:', results);
    onViewListings();
  };

  const getWeight = (): number => {
    const weight = state.listingData?.measurements?.weight;
    if (typeof weight === 'string') {
      const parsed = parseFloat(weight);
      return isNaN(parsed) ? 1 : parsed;
    }
    return typeof weight === 'number' ? weight : 1;
  };

  const getDimensions = (): { length: number; width: number; height: number } => {
    const measurements = state.listingData?.measurements;
    
    const parseValue = (value: string | number | undefined, defaultValue: number): number => {
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return typeof value === 'number' ? value : defaultValue;
    };

    return {
      length: parseValue(measurements?.length, 12),
      width: parseValue(measurements?.width, 12),
      height: parseValue(measurements?.height, 6)
    };
  };

  const getBackButtonText = () => {
    if (uploadMode === null) return 'Back to Dashboard';
    if (uploadMode === 'bulk') return 'Back to Upload Mode';
    if (state.currentStep === 'shipping') return 'Back to Preview';
    if (state.currentStep === 'preview') return 'Back to Photos';
    return 'Back to Upload Mode';
  };

  const getTitle = () => {
    if (uploadMode === null) return 'Create New Listing';
    if (uploadMode === 'bulk') return 'Bulk Upload Manager';
    return 'Create Single Listing';
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title={getTitle()}
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-4xl mx-auto p-4">
        {uploadMode === null && (
          <CreateListingModeSelector onModeSelect={setUploadMode} />
        )}

        {uploadMode === 'single' && (
          <>
            {!isMobile && (
              <CreateListingSteps 
                currentStep={state.currentStep} 
                photos={state.photos}
                listingData={state.listingData}
              />
            )}
            
            <CreateListingContent
              currentStep={state.currentStep}
              photos={state.photos}
              isAnalyzing={actions.isAnalyzing}
              listingData={state.listingData}
              shippingCost={state.shippingCost}
              isSaving={actions.isSaving}
              onPhotosChange={state.handlePhotosChange}
              onAnalyze={actions.handleAnalyze}
              onEdit={handleEdit}
              onExport={actions.handleExport}
              onShippingSelect={state.handleShippingSelect}
              onListingDataChange={state.handleListingDataChange}
              getWeight={getWeight}
              getDimensions={getDimensions}
              onBack={handleBack}
              backButtonText={getBackButtonText()}
            />
          </>
        )}

        {uploadMode === 'bulk' && (
          <BulkUploadManager
            onComplete={handleBulkComplete}
            onBack={() => setUploadMode(null)}
          />
        )}
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="create"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title={getTitle()}
        />
      )}
    </div>
  );
};

export default CreateListing;
