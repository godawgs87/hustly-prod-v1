
import { useState } from 'react';
import { Step, ListingData } from '@/types/CreateListing';

export const useCreateListingState = () => {
  const [currentStep, setCurrentStep] = useState<Step>('photos');
  const [photos, setPhotos] = useState<File[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const handlePhotosChange = (newPhotos: File[]) => {
    setPhotos(newPhotos);
  };

  const handleListingDataChange = (updates: Partial<ListingData>) => {
    setListingData(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleShippingSelect = (option: any) => {
    const newCost = option.cost || 0;
    setShippingCost(newCost);
  };

  return {
    currentStep,
    setCurrentStep,
    photos,
    setPhotos,
    shippingCost,
    setShippingCost,
    listingData,
    setListingData,
    draftId,
    setDraftId,
    isAutoSaving,
    setIsAutoSaving,
    handlePhotosChange,
    handleListingDataChange,
    handleShippingSelect
  };
};
