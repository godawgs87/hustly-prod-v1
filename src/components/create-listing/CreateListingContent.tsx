import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoUpload from '@/components/PhotoUpload';
import PhotoAnalysisProgress from './PhotoAnalysisProgress';
import EditableListingForm from './EditableListingForm';
import { PriceResearchStep } from './PriceResearchStep';
import UnifiedPlatformMapping from './UnifiedPlatformMapping';
import ShippingCalculator from '@/components/ShippingCalculator';
import MultiPlatformCategorySelector from '@/components/enhanced-category/MultiPlatformCategorySelector';
import { Step, ListingData } from '@/types/CreateListing';
import { Loader2, ArrowRight } from 'lucide-react';

interface CreateListingContentProps {
  currentStep: Step;
  photos: File[];
  isAnalyzing: boolean;
  listingData: ListingData | null;
  shippingCost: number;
  isSaving: boolean;
  onPhotosChange: (photos: File[]) => void;
  onAnalyze: () => void;
  onEdit: () => void;
  onExport: () => void;
  onShippingSelect: (option: any) => void;
  onListingDataChange?: (updates: Partial<ListingData>) => void;
  getWeight: () => number;
  getDimensions: () => { length: number; width: number; height: number };
  onBack: () => void;
  backButtonText: string;
  // Price research props
  onPriceResearchComplete?: (priceData: any, suggestedPrice?: number) => void;
  onSkipPriceResearch?: () => void;
  hasSelectedShipping?: boolean;
}

const CreateListingContent = ({
  currentStep,
  photos,
  isAnalyzing,
  listingData,
  shippingCost,
  isSaving,
  onPhotosChange,
  onAnalyze,
  onEdit,
  onExport,
  onShippingSelect,
  onListingDataChange,
  getWeight,
  getDimensions,
  hasSelectedShipping = false,
  onBack,
  backButtonText,
  onPriceResearchComplete,
  onSkipPriceResearch
}: CreateListingContentProps) => {
  console.log(' CreateListingContent - currentStep:', currentStep);
  console.log(' CreateListingContent - listingData exists:', !!listingData);
  console.log(' CreateListingContent - hasSelectedShipping:', hasSelectedShipping);

  if (currentStep === 'photos') {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Upload Photos</h2>
            <p className="text-gray-600 mb-6">
              Upload clear photos of your item from multiple angles
            </p>
          </div>

          <PhotoUpload
            onPhotosChange={onPhotosChange}
            maxPhotos={10}
          />

          {photos.length > 0 && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={onBack}>
                {backButtonText}
              </Button>
              <Button 
                onClick={onAnalyze} 
                disabled={isAnalyzing || photos.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Photos'
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (isAnalyzing) {
    return <PhotoAnalysisProgress />;
  }

  if (currentStep === 'price-research' && listingData) {
    return (
      <PriceResearchStep
        listingData={listingData}
        onPriceResearchComplete={onPriceResearchComplete || (() => {})}
        onBack={onBack}
        onSkip={onSkipPriceResearch || (() => {})}
      />
    );
  }

  if (currentStep === 'analysis' && listingData) {
    return (
      <div className="space-y-6">
        {/* Main Listing Preview - Photos and AI-Generated Content First */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Photo Gallery */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo, index) => (
                <img
                  key={index}
                  src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                  alt={`Product ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
              ))}
            </div>

            {/* AI-Generated Listing Content - Inline without PreviewHeader */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">{listingData.title || 'AI-Generated Title'}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Price</span>
                  <p className="text-2xl font-bold text-green-600">
                    ${listingData.price || (listingData as any).pricing?.suggested_price || '0.00'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Condition</span>
                  <p className="text-lg font-semibold">{listingData.condition || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Category</span>
                  <p className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {(() => {
                      const category = listingData.category;
                      if (category !== null && category !== undefined && typeof category === 'object' && 'primary' in category) {
                        return String((category as any).primary || 'Uncategorized');
                      }
                      return String(category || 'Uncategorized');
                    })()}
                  </p>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="text-gray-700 leading-relaxed mt-1">{listingData.description || 'AI-generated description will appear here'}</p>
              </div>
            </div>

            {/* Unified Platform Mapping */}
            <div className="border-t pt-6">
              <UnifiedPlatformMapping 
                listingData={listingData} 
                basePrice={listingData.price || 25}
              />
            </div>

            {/* Price Research Section - Auto-start on Analysis page */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Price Research</h3>
              <PriceResearchStep 
                listingData={listingData}
                onPriceResearchComplete={(priceData: any, suggestedPrice?: number) => {
                  console.log('💰 [CreateListingContent] Price research completed with price:', suggestedPrice);
                  console.log('💰 [CreateListingContent] Current listingData.price before update:', listingData.price);
                  
                  // Prepare updates object
                  const updates: any = {};
                  
                  if (suggestedPrice && suggestedPrice > 0) {
                    console.log('💰 [CreateListingContent] Calling onListingDataChange with price:', suggestedPrice);
                    updates.price = suggestedPrice;
                  } else {
                    console.warn('💰 [CreateListingContent] Invalid suggested price received:', suggestedPrice);
                  }
                  
                  // NEW: Apply enhanced title and description if available
                  if (priceData?.enhancedTitle && priceData.enhancedTitle !== listingData.title) {
                    console.log('✨ [CreateListingContent] Applying enhanced title:', {
                      original: listingData.title,
                      enhanced: priceData.enhancedTitle
                    });
                    updates.title = priceData.enhancedTitle;
                  }
                  
                  if (priceData?.enhancedDescription && priceData.enhancedDescription !== listingData.description) {
                    console.log('✨ [CreateListingContent] Applying enhanced description');
                    updates.description = priceData.enhancedDescription;
                  }
                  
                  // Update the listing data in the parent component
                  if (Object.keys(updates).length > 0 && onListingDataChange) {
                    onListingDataChange(updates);
                    console.log('💰 [CreateListingContent] onListingDataChange called with updates:', Object.keys(updates));
                  } else if (Object.keys(updates).length === 0) {
                    console.warn('💰 [CreateListingContent] No updates to apply');
                  } else {
                    console.error('💰 [CreateListingContent] onListingDataChange callback is missing!');
                  }
                }}
                onComplete={() => {
                  console.log('🎯 Price research completed, staying on analysis page');
                  // Stay on analysis page for seamless experience
                }}
                onSkip={() => {
                  console.log('🎯 Price research skipped, staying on analysis page');
                  // Stay on analysis page for seamless experience
                }}
                autoStart={true}
                showSkipButton={true}
                compact={true}
              />
            </div>

            {/* Shipping Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Shipping Configuration</h3>
              <ShippingCalculator
                itemWeight={getWeight()}
                itemDimensions={getDimensions()}
                onShippingSelect={onShippingSelect}
              />
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                {backButtonText}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {}}>
                  Save Draft
                </Button>
                <Button 
                  onClick={onExport}
                  disabled={isSaving || !hasSelectedShipping}
                  className={`${
                    !hasSelectedShipping ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  } text-white disabled:opacity-50`}
                  title={!hasSelectedShipping ? "Please select a shipping option" : ""}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish to All Platforms'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Removed separate shipping step - shipping is now integrated into the edit/analysis page

  return null;
};

export default CreateListingContent;
