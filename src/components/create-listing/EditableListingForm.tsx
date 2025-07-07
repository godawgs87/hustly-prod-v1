
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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
  onUpdate: (updates: Partial<ListingData>) => void;
  onEdit: () => void;
  onExport: () => void;
  onBack: () => void;
  backButtonText: string;
  isSaving: boolean;
}

const EditableListingForm = ({
  listingData,
  onUpdate,
  onEdit,
  onExport,
  onBack,
  backButtonText,
  isSaving
}: EditableListingFormProps) => {
  const handleConsignmentUpdate = (field: string, value: any) => {
    console.log('Updating consignment field:', field, 'with value:', value);
    onUpdate({ [field]: value });
  };

  const handleContinueToShipping = () => {
    // This should navigate to shipping step, not publish the listing
    onEdit(); // This will set current step to 'shipping' in the parent component
  };

  console.log('🔍 EditableListingForm - Current listing data:', listingData);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Review & Edit Listing</h2>
          {isSaving && (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Auto-saving...
            </div>
          )}
        </div>

        <div className="space-y-6">
          <BasicInformationSection
            listingData={listingData}
            onUpdate={onUpdate}
          />

          <SizeInformationSection
            listingData={listingData}
            onUpdate={onUpdate}
          />

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
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            {backButtonText}
          </Button>
          <Button 
            onClick={handleContinueToShipping}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Shipping
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EditableListingForm;
