import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import { useUnifiedUploadFlow, UnifiedUploadStep } from '@/hooks/useUnifiedUploadFlow';
import type { StepType } from '@/components/bulk-upload/components/BulkUploadStepRenderer';
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

// Map UnifiedUploadStep to StepType for compatibility
const mapUnifiedStepToBulkStep = (step: UnifiedUploadStep): StepType => {
  switch (step) {
    case 'photos': return 'upload';
    case 'grouping': return 'grouping';
    case 'analysis': return 'analysis';
    case 'price-research': return 'confirmation'; // Map price-research to confirmation for compatibility
    case 'edit': return 'confirmation';
    case 'confirmation': return 'confirmation';
    case 'shipping': return 'shipping';
    case 'finalReview': return 'finalReview';
    default: return 'upload';
  }
};

const CreateListing = ({ onBack, onViewListings }: CreateListingProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk' | null>(null);
  
  // Debug logging for authentication state
  console.log('🔍 CreateListing - user:', user);
  console.log('🔍 CreateListing - user?.email:', user?.email);
  
  // Ensure handleBulkComplete is declared before use
  const handleBulkComplete = (results: any[]) => {
    console.log('Bulk upload completed with results:', results);
    onViewListings();
    // You can add logic here if needed after upload completes
    setUploadMode(null);
  };

  // Use unified upload flow for single item mode
  const singleUpload = useUnifiedUploadFlow({
    mode: 'single',
    onComplete: handleBulkComplete // Reuse bulk complete handler for now
  });

  const handleEdit = () => {
    console.log('🔧 handleEdit called - calling confirmEdit');
    console.log('🔧 Current step before:', singleUpload.currentStep);
    singleUpload.confirmEdit();
    console.log('🔧 Current step after:', singleUpload.currentStep);
  };

  // Helper to provide a fully-populated ListingData object for single upload
  const getSingleListingData = () => {
    const base = singleUpload.photoGroups[0]?.listingData || {};
    // Ensure measurements fields are strings
    const measurements = {
      length: base.measurements?.length !== undefined ? String(base.measurements.length ?? '') : '',
      width: base.measurements?.width !== undefined ? String(base.measurements.width ?? '') : '',
      height: base.measurements?.height !== undefined ? String(base.measurements.height ?? '') : '',
      weight: base.measurements?.weight !== undefined ? String(base.measurements.weight ?? '') : ''
    };
    return {
      title: base.title || '',
      description: base.description || '',
      price: base.price || 0,
      category: base.category || '',
      condition: base.condition || 'used',
      ...base,
      measurements: measurements,
      photos: (singleUpload.photos || []).map(p => typeof p === 'string' ? p : (p.name || ''))
    };
  };

  const handleBack = () => {
    if (uploadMode === null) {
      onBack();
    } else {
      setUploadMode(null);
    }
  };



  const getBackButtonText = () => {
    if (uploadMode === null) return 'Back to Dashboard';
    if (uploadMode === 'bulk') return 'Back to Upload Mode';
    if (uploadMode === 'single' && singleUpload.currentStep === 'shipping') return 'Back to Preview';
    if (uploadMode === 'single' && singleUpload.currentStep === 'confirmation') return 'Back to Photos';
    return 'Back to Upload Mode';
  };

  const getTitle = () => {
    if (uploadMode === null) return 'Create New Listing';
    if (uploadMode === 'bulk') return 'Bulk Upload Manager';
    return 'Create Single Listing';
  };

  // TODO: Replace with real subscription logic
  // Supabase user object: custom claims are usually in app_metadata or user_metadata
  // We'll use app_metadata.plan for now (e.g., 'trial', 'side-hustler', 'serious', 'full-time', 'founders')
  const plan = user?.app_metadata?.plan || 'trial';
  const canUseBulkUpload = plan === 'serious' || plan === 'full-time' || plan === 'founders';

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title={getTitle()}
        userEmail={user?.email}
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
        currentStep={mapUnifiedStepToBulkStep(singleUpload.currentStep) as any} 
        photos={singleUpload.photos}
        listingData={getSingleListingData()}
      />
    )}
    <CreateListingContent
      currentStep={singleUpload.currentStep as any}
      photos={singleUpload.photos}
      isAnalyzing={singleUpload.isAnalyzing}
      listingData={getSingleListingData()}
      shippingCost={0} // TODO: wire if needed
      isSaving={false} // TODO: wire if needed
      onPhotosChange={files => {
        singleUpload.setPhotos(files);
        // Don't auto-trigger analysis, wait for user to click Analyze button
      }}
      onAnalyze={() => {
        // Don't call groupPhotos, just call analyzeGroups directly
        // analyzeGroups will handle creating the group if needed
        singleUpload.analyzeGroups();
      }}
      onEdit={() => {
        console.log('🎯 onEdit wrapper called - about to call handleEdit');
        handleEdit();
        console.log('🎯 onEdit wrapper - handleEdit completed');
      }}
      onExport={singleUpload.postAll}
      onShippingSelect={() => {}} // TODO: wire if needed
      onListingDataChange={updates => {
        if (singleUpload.photoGroups.length > 0) {
          const group = { ...singleUpload.photoGroups[0], listingData: { ...singleUpload.photoGroups[0].listingData, ...updates } };
          singleUpload.setPhotoGroups([group]);
        }
      }}
      getWeight={() => {
        const w = singleUpload.photoGroups[0]?.listingData?.measurements?.weight;
        return typeof w === 'number' ? w : parseFloat(w || '1') || 1;
      }}
      getDimensions={() => {
        const m = singleUpload.photoGroups[0]?.listingData?.measurements;
        const parse = (v: string | number | undefined, d: number) => typeof v === 'number' ? v : parseFloat(v || d.toString()) || d;
        return {
          length: parse(m?.length, 12),
          width: parse(m?.width, 12),
          height: parse(m?.height, 6)
        };
      }}
      onBack={handleBack}
      backButtonText={getBackButtonText()}
      onPriceResearchComplete={singleUpload.handlePriceResearchComplete}
      onSkipPriceResearch={singleUpload.handleSkipPriceResearch}
    />
  </>
)}

        {uploadMode === 'bulk' && (
          <BulkUploadManager
            onComplete={handleBulkComplete}
            onBack={() => setUploadMode(null)}
          />
        )}

        {uploadMode === 'bulk' && !canUseBulkUpload && (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Upgrade Required</h2>
            <p className="mb-4">Bulk upload is only available on Serious Seller and higher plans.</p>
            <Button onClick={() => window.location.href = '/plans'}>See Plans</Button>
          </div>
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
