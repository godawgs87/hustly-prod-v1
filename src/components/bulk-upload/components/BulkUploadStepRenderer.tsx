
import React, { memo } from 'react';
import BulkUploadStep from './BulkUploadStep';
import PhotoGroupingInterface from '../PhotoGroupingInterface';
import BulkReviewDashboard from '../BulkReviewDashboard';
import BulkShippingConfiguration from '../BulkShippingConfiguration';
import type { PhotoGroup } from '../BulkUploadManager';

type StepType = 'upload' | 'grouping' | 'review' | 'shipping';

interface BulkUploadStepRendererProps {
  currentStep: StepType;
  photos: File[];
  photoGroups: PhotoGroup[];
  isGrouping: boolean;
  isAnalyzing?: boolean;
  onPhotosUploaded: (photos: File[]) => void;
  onStartGrouping: () => void;
  onGroupsConfirmed: (groups: PhotoGroup[]) => void;
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostItem: (groupId: string) => void;
  onPostAll: () => void;
  onUpdateGroup: (group: PhotoGroup) => void;
  onRetryAnalysis: (groupId: string) => void;
  onBack: () => void;
  onShippingComplete: (groupsWithShipping: PhotoGroup[]) => void;
  onViewInventory?: () => void;
  onStepChange: (step: StepType) => void;
}

const BulkUploadStepRenderer = memo((props: BulkUploadStepRendererProps) => {
  const { currentStep } = props;

  switch (currentStep) {
    case 'upload':
      return (
        <BulkUploadStep
          photos={props.photos}
          isGrouping={props.isGrouping}
          onPhotosUploaded={props.onPhotosUploaded}
          onStartGrouping={props.onStartGrouping}
          onBack={props.onBack}
        />
      );
      
    case 'grouping':
      return (
        <PhotoGroupingInterface
          photoGroups={props.photoGroups}
          onGroupsConfirmed={props.onGroupsConfirmed}
          onBack={() => props.onStepChange('upload')}
        />
      );
      
    case 'review':
      return (
        <BulkReviewDashboard
          photoGroups={props.photoGroups}
          onEditItem={props.onEditItem}
          onPreviewItem={props.onPreviewItem}
          onPostItem={props.onPostItem}
          onPostAll={props.onPostAll}
          onUpdateGroup={props.onUpdateGroup}
          onRetryAnalysis={props.onRetryAnalysis}
          onProceedToShipping={() => props.onStepChange('shipping')}
          onViewInventory={props.onViewInventory}
          isAnalyzing={props.isAnalyzing}
        />
      );
      
    case 'shipping':
      return (
        <BulkShippingConfiguration
          photoGroups={props.photoGroups}
          onComplete={props.onShippingComplete}
          onBack={() => props.onStepChange('review')}
          onUpdateGroup={props.onUpdateGroup}
        />
      );
      
    default:
      return null;
  }
});

BulkUploadStepRenderer.displayName = 'BulkUploadStepRenderer';

export default BulkUploadStepRenderer;
