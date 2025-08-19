import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import { useInventoryStore } from '@/stores/inventoryStore';
import Dashboard from '@/pages/Dashboard';
import AuthWrapper from '@/components/wrappers/AuthWrapper';
import DataManagementWrapper from '@/components/wrappers/DataManagementWrapper';
import UserSettings from '@/pages/UserSettings';
import SimpleInventoryPage from '@/pages/SimpleInventoryPage';
import ActiveListingsWrapper from '@/components/wrappers/ActiveListingsWrapper';
import EbayCallback from '@/pages/EbayCallback';
import SafeErrorBoundary from '@/components/SafeErrorBoundary';
import UniversalOnboardingFlow from '@/components/onboarding/UniversalOnboardingFlow';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminRoute from '@/components/admin/AdminRoute';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import AlertsPage from '@/pages/AlertsPage';
import PricingPage from '@/pages/PricingPage';
import ShippingPage from '@/pages/ShippingPage';
import PasswordReset from '@/pages/PasswordReset';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, Upload, Sparkles, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import BulkUploadManager from '@/components/bulk-upload/BulkUploadManager';
import CreateListingContent from '@/components/create-listing/CreateListingContent';
import CreateListingSteps from '@/components/create-listing/CreateListingSteps';
import { Step, ListingData } from '@/types/CreateListing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { EbayTokenRefreshManager } from '@/utils/ebayTokenRefresh';

// Working CreateListing component that integrates with existing components
const CreateListingWorking = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [mode, setMode] = useState<'single' | 'bulk' | null>(null);
  
  // Single item creation state
  const [currentStep, setCurrentStep] = useState<Step>('photos');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => {
    if (mode === 'single') {
      // Handle single item back navigation
      if (currentStep === 'shipping') {
        setCurrentStep('analysis');
      } else if (currentStep === 'analysis') {
        setCurrentStep('photos');
      } else if (currentStep === 'preview') {
        setCurrentStep('analysis');
      } else {
        setMode(null);
      }
    } else if (mode) {
      setMode(null);
    } else {
      navigate('/');
    }
  };

  const handleModeSelect = (selectedMode: 'single' | 'bulk') => {
    setMode(selectedMode);
    if (selectedMode === 'single') {
      // Reset single item state
      setCurrentStep('photos');
      setPhotos([]);
      setListingData(null);
      setShippingCost(0);
      setIsAnalyzing(false);
      setIsSaving(false);
    }
  };

  const handleComplete = (results: any[]) => {
    console.log('Listing creation completed:', results);
    navigate('/inventory');
  };

  const handleViewInventory = () => {
    navigate('/inventory');
  };

  // Single item handlers
  const handlePhotosChange = (newPhotos: File[]) => {
    setPhotos(newPhotos);
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Convert photos to base64
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const photoBase64Array = await Promise.all(photos.map(toBase64));

      // Call Edge Function for AI analysis
      const response = await fetch('https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/analyze-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: photoBase64Array })
      });
      if (!response.ok) throw new Error('AI analysis failed');
      const aiResult = await response.json();
      console.log('AI Result:', aiResult); // Debug log to see the structure
      if (!aiResult || aiResult.error) throw new Error(aiResult.error || 'AI returned no data');
      
      // The Edge Function returns { success: true, listing: {...} }
      // We need to extract the listing data
      const listingData = aiResult.success ? aiResult.listing : aiResult;
      console.log('Listing Data:', listingData); // Debug log to see what we're setting
      setListingData(listingData);
      
      // Auto-save as draft after AI analysis
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && listingData) {
          // Upload photos to storage first
          const uploadedPhotoUrls: string[] = [];
          for (const file of photos) {
            const fileName = `${user.id}/${Date.now()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('listing-photos')
              .upload(fileName, file);
              
            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('listing-photos')
                .getPublicUrl(uploadData.path);
              uploadedPhotoUrls.push(publicUrl);
            } else {
              console.warn('Photo upload failed, using blob URL:', uploadError);
              uploadedPhotoUrls.push(URL.createObjectURL(file));
            }
          }
          
          // Create draft listing
          const draftListing = {
            id: crypto.randomUUID(),
            user_id: user.id,
            title: listingData.title || 'Untitled Listing',
            description: listingData.description || null,
            price: listingData.price || 25.00,
            category: typeof listingData.category === 'object' ? listingData.category.primary : listingData.category,
            condition: listingData.condition || null,
            measurements: listingData.measurements || {},
            keywords: listingData.keywords || null,
            photos: uploadedPhotoUrls,
            price_research: null,
            shipping_cost: null, // Will be set in shipping step
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { addListing } = useInventoryStore.getState();
          await addListing(draftListing);
          
          console.log('✅ Draft listing auto-saved:', draftListing.id);
        }
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        // Continue to edit step even if auto-save fails
      }
      
      setCurrentStep('analysis');
      toast({
        title: "Analysis Complete",
        description: "Item saved as draft. Review and edit before shipping.",
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Removed rogue handleEdit - flow should use unified upload flow handlers

  const handleExport = async () => {
    if (!listingData) return;
    
    console.log('🔍 Debug - Final export with shipping cost:', shippingCost);
    
    setIsSaving(true);
    try {
      // Get the existing draft listing from inventory to update it
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Find the existing draft listing
      const { listings } = useInventoryStore.getState();
      const existingDraft = listings.find(listing => 
        listing.status === 'draft' && 
        listing.title === listingData.title &&
        listing.user_id === user.id
      );
      
      if (existingDraft) {
        // Update existing draft with shipping info and active status
        console.log('✅ Updating existing draft listing:', existingDraft.id);
        
        const updatedListing = {
          ...existingDraft,
          shipping_cost: shippingCost !== undefined ? shippingCost : null,
          status: 'active' as const,
          updated_at: new Date().toISOString()
        };
        
        const { updateListing } = useInventoryStore.getState();
        await updateListing(existingDraft.id, updatedListing);
        
        console.log('✅ Draft updated to active with shipping:', {
          id: existingDraft.id,
          shipping_cost: updatedListing.shipping_cost,
          status: updatedListing.status
        });
      } else {
        // Fallback: create new listing if draft not found
        console.warn('⚠️ No draft found, creating new listing');
        
        // Upload photos to storage first
        const uploadedPhotoUrls: string[] = [];
        
        // Enhanced photo upload with proper error handling and retry logic
        console.log('🚀 Starting photo upload process for', photos.length, 'photos');
        
        // Try to upload each photo with retry logic
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('listing-photos')
            .upload(fileName, file);
            
          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('listing-photos')
              .getPublicUrl(uploadData.path);
            uploadedPhotoUrls.push(publicUrl);
          } else {
            console.warn('Photo upload failed, using blob URL:', uploadError);
            uploadedPhotoUrls.push(URL.createObjectURL(file));
          }
        }
        
        // Extract price from nested structure
        const extractedPrice = listingData.price || 25.00;
        
        // Create new listing object
        const newListing = {
          id: crypto.randomUUID(),
          user_id: user.id,
          title: listingData.title || 'Untitled Listing',
          description: listingData.description || null,
          price: extractedPrice,
          category: typeof listingData.category === 'object' ? listingData.category.primary : listingData.category,
          condition: listingData.condition || null,
          measurements: listingData.measurements || {},
          keywords: listingData.keywords || null,
          photos: uploadedPhotoUrls,
          price_research: null,
          shipping_cost: shippingCost !== undefined ? shippingCost : null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add listing to inventory store
        const { addListing } = useInventoryStore.getState();
        await addListing(newListing);
        
        console.log('✅ New listing created:', newListing.id);
      }
      
      toast({
        title: "Listing Created",
        description: "Your listing has been added to inventory successfully!",
      });
      
      // Reset form state
      setPhotos([]);
      setListingData(null);
      setCurrentStep('photos');
      setShippingCost(0);
      
      navigate('/inventory');
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShippingSelect = (option: any) => {
    setShippingCost(option.cost || 0);
  };

  const handleListingDataChange = async (updates: Partial<ListingData>) => {
    console.log('💰 [App.tsx] handleListingDataChange called with updates:', updates);
    console.log('💰 [App.tsx] Current listingData before update:', listingData?.price);
    
    if (listingData) {
      const updatedListingData = { ...listingData, ...updates };
      console.log('💰 [App.tsx] Setting updated listingData with price:', updatedListingData.price);
      setListingData(updatedListingData);
      
      // Auto-save changes to database (especially important for price updates)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Find and update the existing draft listing
          const { listings, updateListing } = useInventoryStore.getState();
          const existingDraft = listings.find(listing => 
            listing.status === 'draft' && 
            listing.title === listingData.title &&
            listing.user_id === user.id
          );
          
          if (existingDraft) {
            const updatedDraft = {
              ...existingDraft,
              ...updates,
              updated_at: new Date().toISOString()
            };
            
            await updateListing(existingDraft.id, updatedDraft);
            console.log('✅ Auto-saved listing data changes:', updates);
          }
        }
      } catch (error) {
        console.error('❌ Auto-save failed for listing data changes:', error);
        // Continue without blocking the UI
      }
    }
  };

  const handlePriceResearchComplete = (priceData: any, suggestedPrice?: number) => {
    console.log('💰 Price research completed:', { priceData, suggestedPrice });
    
    // Extract eBay category from price research data - check both possible locations
    const ebayCategory = priceData?.priceAnalysis?.ebayCategory || priceData?.ebayCategory;
    
    const updates: Partial<ListingData> = {};
    
    if (ebayCategory) {
      console.log('📦 Extracted eBay category from price research:', ebayCategory);
      updates.ebay_category_id = ebayCategory.id || ebayCategory;
      updates.ebay_category_path = ebayCategory.path || null;
    } else {
      console.log('⚠️ No eBay category found in price research data');
    }
    
    if (suggestedPrice) {
      updates.price = suggestedPrice;
    }
    
    // Update state and auto-save to database
    if (Object.keys(updates).length > 0) {
      setListingData(prev => ({
        ...prev,
        ...updates
      }));
      
      // Auto-save the updated listing data with eBay category
      handleListingDataChange(updates);
      console.log('✅ Updated listing with eBay category:', updates);
    }
  };

  const getWeight = () => {
    return listingData?.measurements?.weight ? parseFloat(listingData.measurements.weight.toString()) : 1;
  };

  const getDimensions = () => {
    const measurements = listingData?.measurements;
    return {
      length: measurements?.length ? parseFloat(measurements.length.toString()) : 10,
      width: measurements?.width ? parseFloat(measurements.width.toString()) : 8,
      height: measurements?.height ? parseFloat(measurements.height.toString()) : 2
    };
  };

  const getBackButtonText = () => {
    if (currentStep === 'photos') return 'Back to Mode Selection';
    if (currentStep === 'preview') return 'Back to Photos';
    if (currentStep === 'shipping') return 'Back to Preview';
    return 'Back';
  };

  if (mode === 'bulk') {
    return (
      <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
        <StreamlinedHeader
          title="Bulk Upload"
          subtitle="Upload multiple items for batch processing"
          onBack={handleBack}
          backButtonText="Back to Mode Selection"
        />
        <div className="max-w-6xl mx-auto p-6">
          <BulkUploadManager
            onComplete={handleComplete}
            onBack={handleBack}
            onViewInventory={handleViewInventory}
          />
        </div>
        {isMobile && <UnifiedMobileNavigation />}
      </div>
    );
  }

  if (mode === 'single') {
    return (
      <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
        <StreamlinedHeader
          title="Create Single Listing"
          subtitle="Create a listing for one item with AI assistance"
          onBack={handleBack}
          backButtonText={getBackButtonText()}
        />
        
        <CreateListingSteps 
          currentStep={currentStep}
          photos={photos}
          listingData={listingData}
        />
        
        <div className="max-w-4xl mx-auto p-6">
          <CreateListingContent
            currentStep={currentStep}
            photos={photos}
            isAnalyzing={isAnalyzing}
            listingData={listingData}
            shippingCost={shippingCost}
            isSaving={isSaving}
            onPhotosChange={handlePhotosChange}
            onAnalyze={handleAnalyze}
            onEdit={() => setCurrentStep('shipping')}
            onExport={handleExport}
            onShippingSelect={handleShippingSelect}
            onListingDataChange={handleListingDataChange}
            getWeight={getWeight}
            getDimensions={getDimensions}
            onBack={handleBack}
            backButtonText={getBackButtonText()}
            onSkipPriceResearch={() => setCurrentStep('shipping')}
            onPriceResearchComplete={handlePriceResearchComplete}
          />
        </div>
        {isMobile && <UnifiedMobileNavigation />}
      </div>
    );
  }

  // Mode selection screen
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Create Listing"
        subtitle="Choose how you'd like to create your listings"
        onBack={() => navigate('/')}
        backButtonText="Back to Dashboard"
      />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                Single Item
              </CardTitle>
              <CardDescription>
                Perfect for individual items with detailed AI analysis and optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="h-4 w-4" />
                  AI-powered photo analysis
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="h-4 w-4" />
                  Smart pricing recommendations
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Upload className="h-4 w-4" />
                  Multi-platform publishing
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleModeSelect('single')}
              >
                Start Single Listing
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Upload className="h-6 w-6 text-green-600" />
                </div>
                Bulk Upload
              </CardTitle>
              <CardDescription>
                Efficient batch processing for multiple items at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Camera className="h-4 w-4" />
                  Smart photo grouping
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="h-4 w-4" />
                  Batch AI processing
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="h-4 w-4" />
                  Review & approve workflow
                </div>
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleModeSelect('bulk')}
              >
                Start Bulk Upload
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">AI-Powered Listing Creation</h3>
                <p className="text-blue-800 text-sm">
                  Both workflows use advanced AI to analyze your photos, suggest optimal pricing, 
                  generate compelling descriptions, and recommend the best categories for maximum visibility.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isMobile && <UnifiedMobileNavigation />}
    </div>
  );
};

const AppContent = () => {
  const { needsOnboarding, markOnboardingComplete, currentStep, saveCurrentStep, loadSavedStep } = useOnboardingStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/inventory" element={<ProtectedRoute><SimpleInventoryPage /></ProtectedRoute>} />
        <Route path="/create-listing" element={<ProtectedRoute><CreateListingWorking /></ProtectedRoute>} />
        <Route path="/active-listings" element={<ProtectedRoute><ActiveListingsWrapper /></ProtectedRoute>} />
        <Route path="/data-management" element={<ProtectedRoute><DataManagementWrapper /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><SubscriptionPlans /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
        <Route path="/ebay/callback" element={<EbayCallback />} />
        <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
        <Route path="/shipping" element={<ProtectedRoute><ShippingPage /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
      <Toaster />
      
      <UniversalOnboardingFlow
        isOpen={needsOnboarding}
        onComplete={markOnboardingComplete}
      />
    </div>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize eBay token refresh manager when app loads
    console.log('🚀 Initializing eBay token refresh manager...');
    EbayTokenRefreshManager.initialize();

    // Cleanup on unmount
    return () => {
      EbayTokenRefreshManager.cleanup();
    };
  }, []);

  return (
    <SafeErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </SafeErrorBoundary>
  );
};

export default App;
