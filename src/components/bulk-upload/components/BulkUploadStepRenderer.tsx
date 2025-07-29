import React, { memo } from 'react';
import BulkUploadStep from './BulkUploadStep';
import PhotoGroupingInterface from '../PhotoGroupingInterface';
import BulkReviewDashboard from '../BulkReviewDashboard';
import BulkShippingConfiguration from '../BulkShippingConfiguration';
import BulkPriceResearchStep from '../BulkPriceResearchStep';
import BulkCombinedAnalysisStep from '../BulkCombinedAnalysisStep';
import AIDetailsTableView from './AIDetailsTableView';
import type { PhotoGroup } from '../BulkUploadManager';

export type StepType = 'upload' | 'grouping' | 'combinedAnalysis' | 'shipping' | 'finalReview' | 'priceResearch';

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
  onCategoriesComplete: (groupsWithCategories: PhotoGroup[]) => void;
  onShippingComplete: (groupsWithShipping: PhotoGroup[]) => void;
  onViewInventory?: () => void;
  onStepChange: (step: StepType) => void;
  onStartAnalysis?: () => void;
  onStartBulkAnalysis?: () => void;
  onProceedToShipping?: () => void;
  onStartPriceResearch?: () => void;
  onPriceResearchComplete?: (groupsWithPrices: PhotoGroup[]) => void;
  isPriceResearching?: boolean;
}

const BulkUploadStepRenderer = memo((props: BulkUploadStepRendererProps) => {
  const { currentStep } = props;
  
  console.log('🔍 BULK UPLOAD STEP:', currentStep, 'photoGroups:', props.photoGroups?.length || 0);

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
      
    case 'combinedAnalysis':
      return (
        <BulkCombinedAnalysisStep
          photoGroups={props.photoGroups}
          onComplete={(groupsWithData) => {
            // Update groups with AI and price data, then proceed to shipping
            props.photoGroups.forEach((group, index) => {
              if (groupsWithData[index]) {
                props.onUpdateGroup(groupsWithData[index]);
              }
            });
            props.onStepChange('shipping');
          }}
          onBack={() => props.onStepChange('grouping')}
        />
      );
    case 'shipping':
      return (
        <BulkShippingConfiguration
          photoGroups={props.photoGroups}
          onComplete={props.onShippingComplete}
          onBack={() => props.onStepChange('combinedAnalysis')}
          onUpdateGroup={props.onUpdateGroup}
        />
      );
    case 'finalReview':
      return (
        <div>
          {/* Add back button and Upload All button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 font-medium"
                onClick={() => props.onStepChange('shipping')}
              >
                ← Back to Shipping
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Final Review & Upload</h2>
            </div>
            <button
              className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 font-semibold text-lg"
              onClick={props.onPostAll}
            >
              📦 Upload All to Inventory
            </button>
          </div>
          <AIDetailsTableView
            photoGroups={props.photoGroups}
            onEditItem={props.onEditItem}
            onPreviewItem={props.onPreviewItem}
            onPostItem={props.onPostItem}
            onRunAI={props.onRetryAnalysis}
            onUpdateGroup={props.onUpdateGroup}
            isAnalyzing={props.isAnalyzing}
          />
        </div>
      );
      
    case 'priceResearch':
      // Fallback: redirect old priceResearch step to combinedAnalysis
      console.log('🔄 Redirecting old priceResearch step to combinedAnalysis');
      props.onStepChange('combinedAnalysis');
      return (
        <BulkCombinedAnalysisStep
          photoGroups={props.photoGroups}
          onComplete={(groupsWithData) => {
            // Update groups with AI and price data, then proceed to shipping
            props.photoGroups.forEach((group, index) => {
              if (groupsWithData[index]) {
                props.onUpdateGroup(groupsWithData[index]);
              }
            });
            props.onStepChange('shipping');
          }}
          onBack={() => props.onStepChange('grouping')}
        />
      );
      
    default:
      return null;
  }
});

BulkUploadStepRenderer.displayName = 'BulkUploadStepRenderer';
export default BulkUploadStepRenderer;
