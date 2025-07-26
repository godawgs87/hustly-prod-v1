import React, { memo } from 'react';
import BulkUploadStep from './BulkUploadStep';
import PhotoGroupingInterface from '../PhotoGroupingInterface';
import BulkReviewDashboard from '../BulkReviewDashboard';
import BulkShippingConfiguration from '../BulkShippingConfiguration';
import AIDetailsTableView from './AIDetailsTableView';
import type { PhotoGroup } from '../BulkUploadManager';

export type StepType = 'upload' | 'grouping' | 'analysis' | 'confirmation' | 'shipping' | 'finalReview';

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
      
    case 'analysis':
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
          {props.isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <h3 className="text-lg font-medium">Analyzing Items...</h3>
              <p className="text-muted-foreground">Our AI is analyzing your items to generate detailed listings.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                <p className="text-sm text-blue-700">
                  Processing {props.photoGroups.length} item groups. This may take a few minutes.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.548-1.053l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Ready for AI Analysis</h3>
              <p className="text-muted-foreground max-w-md">
                Your photos have been grouped into {props.photoGroups.length} items. 
                Click below to start AI analysis and generate detailed listings.
              </p>
              <div className="bg-gray-50 border rounded-lg p-4 max-w-md">
                <h4 className="font-medium mb-2">What AI will analyze:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Item titles and descriptions</li>
                  <li>• Pricing recommendations</li>
                  <li>• Category suggestions</li>
                  <li>• Condition assessment</li>
                  <li>• Measurements and features</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={props.onBack}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Back to Grouping
                </button>
                <button
                  onClick={() => props.onStartAnalysis ? props.onStartAnalysis() : props.onStepChange('confirmation')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Start AI Analysis
                </button>
              </div>
            </>
          )}
        </div>
      );
    case 'confirmation':
      return (
        <BulkReviewDashboard
          photoGroups={props.photoGroups}
          onEditItem={props.onEditItem}
          onPreviewItem={props.onPreviewItem}
          onPostItem={props.onPostItem}
          onPostAll={props.onPostAll}
          onUpdateGroup={props.onUpdateGroup}
          onRetryAnalysis={props.onRetryAnalysis}
          onRunAI={props.onRetryAnalysis}
          onViewInventory={props.onViewInventory}
          isAnalyzing={props.isAnalyzing}
          onStartBulkAnalysis={props.onStartBulkAnalysis}
          onProceedToShipping={props.onProceedToShipping}
          onBackToGrouping={() => props.onStepChange('grouping')}
        />
      );
    case 'shipping':
      return (
        <BulkShippingConfiguration
          photoGroups={props.photoGroups}
          onComplete={props.onShippingComplete}
          onBack={() => props.onStepChange('confirmation')}
          onUpdateGroup={props.onUpdateGroup}
        >
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Apply to Multiple Items
            </h3>
            <div className="flex flex-wrap gap-3">
              <button 
                className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 flex items-center"
                onClick={() => {
                  // Apply Free Shipping to all items
                  props.photoGroups.forEach(group => {
                    props.onUpdateGroup({
                      ...group,
                      selectedShipping: { id: 'free-shipping', cost: 0, name: 'Free Shipping', estimatedDays: '3-5 business days' }
                    });
                  });
                }}
              >
                <span className="mr-2">🆓</span>
                All Items → Free Shipping
              </button>
              <button 
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 flex items-center"
                onClick={() => {
                  // Apply Ground shipping to all items
                  props.photoGroups.forEach(group => {
                    props.onUpdateGroup({
                      ...group,
                      selectedShipping: { id: 'ground-shipping', cost: 8.00, name: 'USPS Ground Advantage', estimatedDays: '3-5 business days' }
                    });
                  });
                }}
              >
                <span className="mr-2">📦</span>
                Low Value → Ground ($6-10)
              </button>
              <button 
                className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg hover:bg-purple-200 flex items-center"
                onClick={() => {
                  // Apply Priority shipping to all items
                  props.photoGroups.forEach(group => {
                    props.onUpdateGroup({
                      ...group,
                      selectedShipping: { id: 'priority-shipping', cost: 12.00, name: 'USPS Priority Mail', estimatedDays: '1-3 business days' }
                    });
                  });
                }}
              >
                <span className="mr-2">🚀</span>
                High Value → Priority ($10-15)
              </button>
            </div>
          </div>
        </BulkShippingConfiguration>
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
      
    default:
      return null;
  }
});

BulkUploadStepRenderer.displayName = 'BulkUploadStepRenderer';
export default BulkUploadStepRenderer;
