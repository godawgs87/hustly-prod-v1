import { useState } from 'react';
import type { PhotoGroup } from '../BulkUploadManager';

type StepType = 'upload' | 'grouping' | 'review' | 'shipping';

export const useBulkUploadState = () => {
  const [currentStep, setCurrentStep] = useState<StepType>('upload');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  return {
    currentStep,
    setCurrentStep,
    photos,
    setPhotos,
    photoGroups,
    setPhotoGroups,
    isGrouping,
    setIsGrouping,
    processingResults,
    setProcessingResults,
    currentReviewIndex,
    setCurrentReviewIndex
  };
};
