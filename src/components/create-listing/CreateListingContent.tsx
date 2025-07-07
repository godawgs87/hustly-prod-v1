
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoUpload from '@/components/PhotoUpload';
import PhotoAnalysisProgress from './PhotoAnalysisProgress';
import EditableListingForm from './EditableListingForm';
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
  onBack,
  backButtonText
}: CreateListingContentProps) => {
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

  if (currentStep === 'preview' && listingData) {
    return (
      <div className="space-y-6">
        {/* Category Selection Section */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Platform Categories</h2>
              <p className="text-gray-600 mb-6">
                Set categories for each platform to optimize your listing reach
              </p>
            </div>

            <MultiPlatformCategorySelector
              internalCategory={listingData.category}
              currentCategories={{
                ebay_category_id: listingData.ebay_category_id,
                ebay_category_path: listingData.ebay_category_path,
                mercari_category_id: listingData.mercari_category_id,
                mercari_category_path: listingData.mercari_category_path,
                poshmark_category_id: listingData.poshmark_category_id,
                poshmark_category_path: listingData.poshmark_category_path,
                depop_category_id: listingData.depop_category_id,
                depop_category_path: listingData.depop_category_path,
                facebook_category_id: listingData.facebook_category_id,
                facebook_category_path: listingData.facebook_category_path,
              }}
              onCategoryChange={(platform, categoryId, categoryPath) => {
                if (onListingDataChange) {
                  onListingDataChange({
                    [`${platform}_category_id`]: categoryId,
                    [`${platform}_category_path`]: categoryPath,
                  });
                }
              }}
              platforms={['ebay']} // Start with eBay, add others later
              showSuggestions={true}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onBack}>
                {backButtonText}
              </Button>
              <Button 
                onClick={onEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue to Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Editable Form */}
        <EditableListingForm
          listingData={listingData}
          onUpdate={onListingDataChange || (() => {})}
          onEdit={onEdit}
          onExport={onExport}
          onBack={onBack}
          backButtonText="Back to Categories"
          isSaving={isSaving}
          hideBackButton={true}
        />
      </div>
    );
  }

  if (currentStep === 'shipping' && listingData) {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Calculate Shipping</h2>
            <p className="text-gray-600 mb-6">
              Choose your shipping method to complete the listing
            </p>
          </div>

          <ShippingCalculator
            itemWeight={getWeight()}
            itemDimensions={getDimensions()}
            onShippingSelect={onShippingSelect}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              {backButtonText}
            </Button>
            <Button 
              onClick={onExport}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Listing'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};

export default CreateListingContent;
