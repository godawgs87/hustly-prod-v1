
import { ListingData } from '@/types/CreateListing';

export const validateListingData = (data: ListingData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Only check essential fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Valid price is required');
  }
  
  if (!data.photos || data.photos.length === 0) {
    errors.push('At least one photo is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeListingData = (data: ListingData): ListingData => {
  return {
    ...data,
    title: data.title?.trim() || '',
    description: data.description?.trim() || '',
    category: data.category?.trim() || '',
    condition: data.condition?.trim() || '',
    price: Number(data.price) || 0,
    measurements: data.measurements || {},
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    photos: Array.isArray(data.photos) ? data.photos : []
  };
};
