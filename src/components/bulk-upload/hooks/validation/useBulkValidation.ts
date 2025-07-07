
import type { PhotoGroup } from '../../BulkUploadManager';

export const useBulkValidation = () => {
  const validateGroupForSave = (group: PhotoGroup): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Match single item upload validation
    if (!group.listingData?.title?.trim()) {
      errors.push('Title is required');
    }
    
    if (!group.listingData?.price || group.listingData.price <= 0) {
      errors.push('Valid price is required');
    }
    
    if (!group.selectedShipping) {
      errors.push('Shipping option is required');
    }
    
    if (!group.listingData?.category?.trim()) {
      errors.push('Category is required');
    }
    
    if (!group.listingData?.condition?.trim()) {
      errors.push('Condition is required');
    }

    // Ensure measurements exist - weight is critical for shipping
    if (!group.listingData?.measurements?.weight || 
        (typeof group.listingData.measurements.weight === 'string' && !group.listingData.measurements.weight.trim()) ||
        (typeof group.listingData.measurements.weight === 'number' && group.listingData.measurements.weight <= 0)) {
      errors.push('Weight measurement is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateGroupForDraft = (group: PhotoGroup): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Only require title for draft (matching single item upload)
    if (!group.listingData?.title?.trim()) {
      errors.push('Title is required for saving as draft');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
    validateGroupForSave,
    validateGroupForDraft
  };
};
