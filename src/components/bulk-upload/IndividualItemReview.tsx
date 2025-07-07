
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import IndividualReviewHeader from './components/IndividualReviewHeader';
import IndividualReviewActions from './components/IndividualReviewActions';
import BulkConsignmentOptions from './components/BulkConsignmentOptions';
import BulkShippingOptions from './components/BulkShippingOptions';
import EditableListingForm from '../create-listing/EditableListingForm';
import type { PhotoGroup } from './BulkUploadManager';
import type { ListingData } from '@/types/CreateListing';

interface IndividualItemReviewProps {
  group: PhotoGroup;
  currentIndex: number;
  totalItems: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onApprove: (updatedGroup: PhotoGroup) => void;
  onReject: () => void;
  onSaveDraft: (updatedGroup: PhotoGroup) => void;
}

const IndividualItemReview = ({
  group,
  currentIndex,
  totalItems,
  onBack,
  onNext,
  onSkip,
  onApprove,
  onReject,
  onSaveDraft
}: IndividualItemReviewProps) => {
  const [editedGroup, setEditedGroup] = useState<PhotoGroup>(group);
  const { toast } = useToast();

  useEffect(() => {
    setEditedGroup(group);
  }, [group]);

  const handleListingDataUpdate = (updates: Partial<ListingData>) => {
    console.log('Updating listing data:', updates);
    setEditedGroup(prev => ({
      ...prev,
      listingData: {
        ...prev.listingData,
        ...updates
      }
    }));
  };

  const handleConsignmentUpdate = (field: string, value: any) => {
    console.log('Updating consignment field:', field, value);
    setEditedGroup(prev => ({
      ...prev,
      listingData: {
        ...prev.listingData,
        [field]: value
      }
    }));
  };

  const handleShippingSelect = (option: any) => {
    console.log('Shipping option selected:', option);
    setEditedGroup(prev => ({
      ...prev,
      selectedShipping: {
        id: option.id,
        name: option.name,
        cost: option.cost,
        estimatedDays: option.days || option.estimatedDays || 'TBD'
      }
    }));
  };

  const handleApprove = () => {
    console.log('Approving item with data:', editedGroup);
    
    // Validation matching single item upload exactly
    const errors = [];
    if (!editedGroup.listingData?.title?.trim()) errors.push('Title');
    if (!editedGroup.listingData?.price || editedGroup.listingData.price <= 0) errors.push('Price');
    if (!editedGroup.selectedShipping) errors.push('Shipping option');
    if (!editedGroup.listingData?.category?.trim()) errors.push('Category');
    if (!editedGroup.listingData?.condition?.trim()) errors.push('Condition');
    
    if (errors.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please complete: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    onApprove(editedGroup);
  };

  const handleSaveDraft = () => {
    console.log('Saving draft with data:', editedGroup);
    if (!editedGroup.listingData?.title?.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title before saving as draft.",
        variant: "destructive"
      });
      return;
    }
    onSaveDraft(editedGroup);
  };

  const getWeight = (): number => {
    const weight = editedGroup.listingData?.measurements?.weight;
    if (typeof weight === 'string') {
      const parsed = parseFloat(weight);
      return isNaN(parsed) ? 1 : parsed;
    }
    return typeof weight === 'number' ? weight : 1;
  };

  const getDimensions = (): { length: number; width: number; height: number } => {
    const measurements = editedGroup.listingData?.measurements;
    
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

  const ensureListingData = (): ListingData => {
    const baseData = editedGroup.listingData || {};
    
    // Ensure all fields are populated with AI-generated or default values
    return {
      title: baseData.title || `${editedGroup.name} - Quality Item`,
      description: baseData.description || 'Quality item in good condition. Please see photos for details.',
      price: baseData.price || 25,
      category: baseData.category || 'Miscellaneous',
      category_id: baseData.category_id || null,
      condition: baseData.condition || 'Good',
      measurements: {
        length: baseData.measurements?.length ? String(baseData.measurements.length) : '12',
        width: baseData.measurements?.width ? String(baseData.measurements.width) : '8',
        height: baseData.measurements?.height ? String(baseData.measurements.height) : '4',
        weight: baseData.measurements?.weight ? String(baseData.measurements.weight) : '1'
      },
      photos: baseData.photos || [],
      keywords: baseData.keywords || ['quality', 'authentic'],
      priceResearch: baseData.priceResearch || 'Market research shows similar items selling for competitive prices.',
      purchase_price: baseData.purchase_price,
      purchase_date: baseData.purchase_date,
      source_location: baseData.source_location,
      source_type: baseData.source_type,
      is_consignment: baseData.is_consignment || false,
      consignment_percentage: baseData.consignment_percentage,
      consignor_name: baseData.consignor_name,
      consignor_contact: baseData.consignor_contact,
      clothing_size: baseData.clothing_size,
      shoe_size: baseData.shoe_size,
      gender: baseData.gender,
      age_group: baseData.age_group,
      features: baseData.features || ['Quality construction', 'Well-maintained'],
      includes: baseData.includes || ['Item as shown'],
      defects: baseData.defects || []
    };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <IndividualReviewHeader
        group={editedGroup}
        currentIndex={currentIndex}
        totalItems={totalItems}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <EditableListingForm
                listingData={ensureListingData()}
                onUpdate={handleListingDataUpdate}
                onEdit={() => {}}
                onExport={() => {}}
                onBack={() => {}}
                backButtonText=""
                isSaving={false}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <BulkConsignmentOptions
            data={{
              purchase_price: editedGroup.listingData?.purchase_price,
              purchase_date: editedGroup.listingData?.purchase_date,
              source_location: editedGroup.listingData?.source_location,
              source_type: editedGroup.listingData?.source_type,
              is_consignment: editedGroup.listingData?.is_consignment,
              consignment_percentage: editedGroup.listingData?.consignment_percentage,
              consignor_name: editedGroup.listingData?.consignor_name,
              consignor_contact: editedGroup.listingData?.consignor_contact
            }}
            onChange={handleConsignmentUpdate}
            listingPrice={editedGroup.listingData?.price || 0}
          />

          <Separator />

          <BulkShippingOptions
            itemWeight={getWeight()}
            itemDimensions={getDimensions()}
            onShippingSelect={handleShippingSelect}
            selectedOption={editedGroup.selectedShipping ? {
              id: editedGroup.selectedShipping.id,
              name: editedGroup.selectedShipping.name,
              cost: editedGroup.selectedShipping.cost,
              days: editedGroup.selectedShipping.estimatedDays,
              description: `${editedGroup.selectedShipping.name} shipping option`
            } : undefined}
          />
        </div>
      </div>
      
      <IndividualReviewActions
        onBack={onBack}
        onNext={onNext}
        onSkip={onSkip}
        onApprove={handleApprove}
        onReject={onReject}
        onSaveDraft={handleSaveDraft}
        currentIndex={currentIndex}
        totalItems={totalItems}
        canApprove={!!(
          editedGroup.listingData?.title?.trim() && 
          editedGroup.listingData?.price && 
          editedGroup.listingData.price > 0 &&
          editedGroup.selectedShipping &&
          editedGroup.listingData?.category?.trim() &&
          editedGroup.listingData?.condition?.trim()
        )}
      />
    </div>
  );
};

export default IndividualItemReview;
