import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, Image, DollarSign, Info } from 'lucide-react';
import BasicInformationSection from './sections/BasicInformationSection';
import MeasurementsSection from './sections/MeasurementsSection';
import KeywordsSection from './sections/KeywordsSection';
import FeaturesSection from './sections/FeaturesSection';
import SizeInformationSection from './sections/SizeInformationSection';
import SKUSection from './sections/SKUSection';
import PurchaseConsignmentSection from '@/components/create-listing/PurchaseConsignmentSection';
import { ListingData } from '@/types/CreateListing';

interface EditableListingFormProps {
  listingData: ListingData;
  photos?: File[];
  onUpdate: (updates: Partial<ListingData>) => void;
  onEdit: () => void;
  onExport: () => void;
  onBack: () => void;
  backButtonText: string;
  isSaving: boolean;
  hideBackButton?: boolean;
  onSkipPriceResearch?: () => void;
}

const EditableListingForm = ({
  listingData,
  photos = [],
  onUpdate,
  onEdit,
  onExport,
  onBack,
  backButtonText,
  isSaving,
  hideBackButton = false,
  onSkipPriceResearch
}: EditableListingFormProps) => {
  console.log('🔍 EditableListingForm - onEdit function:', onEdit);
  console.log('🔍 EditableListingForm - onEdit type:', typeof onEdit);
  console.log('🔍 EditableListingForm - onEdit toString:', onEdit.toString());

  const [activeTab, setActiveTab] = useState("basics");

  const handleConsignmentUpdate = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleContinueToShipping = () => {
    console.log('🚀 handleContinueToShipping called in EditableListingForm');
    console.log('🚀 About to call onEdit()');
    onEdit();
    console.log('🚀 onEdit() called');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit Listing</h2>
          {isSaving && (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Auto-saving...
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basics" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Photos</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <div className="space-y-6">
              <BasicInformationSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
              <SizeInformationSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            {photos && photos.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Listing Photos ({photos.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border shadow-sm"
                      />
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Button variant="outline">
                    Add More Photos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Photo Management</h3>
                <p className="text-gray-600 mb-4">Upload, reorder, and manage your listing photos</p>
                <Button variant="outline">
                  Add Photos
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <PurchaseConsignmentSection
              data={{
                purchase_price: listingData.purchase_price,
                purchase_date: listingData.purchase_date,
                source_location: listingData.source_location,
                source_type: listingData.source_type,
                is_consignment: listingData.is_consignment,
                consignment_percentage: listingData.consignment_percentage,
                consignor_name: listingData.consignor_name,
                consignor_contact: listingData.consignor_contact
              }}
              onChange={handleConsignmentUpdate}
              listingPrice={listingData.price}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6">
              <MeasurementsSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
              <KeywordsSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
              <FeaturesSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
              <SKUSection
                listingData={listingData}
                onUpdate={onUpdate}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-8 pt-6 border-t">
          {!hideBackButton && (
            <Button variant="outline" onClick={onBack}>
              {backButtonText}
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button 
              variant="outline"
              onClick={onExport}
              disabled={isSaving}
            >
              Save Draft
            </Button>
            <Button 
              onClick={handleContinueToShipping}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue to Shipping
            </Button>
            {onSkipPriceResearch && (
              <Button 
                onClick={onSkipPriceResearch}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Skip Pricing
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditableListingForm;
