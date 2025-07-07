
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoUpload from '@/components/PhotoUpload';
import PhotoAnalysisProgress from './PhotoAnalysisProgress';
import EditableListingForm from './EditableListingForm';
import ShippingCalculator from '@/components/ShippingCalculator';
import { Step, ListingData } from '@/types/CreateListing';
import { Loader2 } from 'lucide-react';

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
      <EditableListingForm
        listingData={listingData}
        onUpdate={onListingDataChange || (() => {})}
        onEdit={onEdit}
        onExport={onExport}
        onBack={onBack}
        backButtonText={backButtonText}
        isSaving={isSaving}
      />
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
