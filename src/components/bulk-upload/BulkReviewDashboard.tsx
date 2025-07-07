
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import EnhancedPreviewDialog from './components/EnhancedPreviewDialog';
import AIDetailsTableView from './components/AIDetailsTableView';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkReviewDashboardProps {
  photoGroups: PhotoGroup[];
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostItem: (groupId: string) => void;
  onPostAll: () => void;
  onUpdateGroup?: (updatedGroup: PhotoGroup) => void;
  onRetryAnalysis?: (groupId: string) => void;
  onProceedToShipping?: () => void;
  onViewInventory?: () => void;
  isAnalyzing?: boolean;
}

const BulkReviewDashboard = ({
  photoGroups,
  onEditItem,
  onPreviewItem,
  onPostItem,
  onPostAll,
  onUpdateGroup,
  onRetryAnalysis,
  onProceedToShipping,
  onViewInventory,
  isAnalyzing
}: BulkReviewDashboardProps) => {
  const [previewGroup, setPreviewGroup] = useState<PhotoGroup | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewClick = (groupId: string) => {
    const group = photoGroups.find(g => g.id === groupId);
    if (group) {
      setPreviewGroup(group);
      setIsPreviewOpen(true);
    }
  };

  const handlePreviewSave = (updatedGroup: PhotoGroup) => {
    if (onUpdateGroup) {
      onUpdateGroup(updatedGroup);
    }
    setIsPreviewOpen(false);
  };

  const handleRunAI = (groupId: string) => {
    if (onRetryAnalysis) {
      onRetryAnalysis(groupId);
    }
  };

  const completedItems = photoGroups.filter(g => g.status === 'completed').length;
  const readyForShipping = photoGroups.filter(g => g.status === 'completed' && !g.selectedShipping).length;
  const readyToPost = photoGroups.filter(g => g.status === 'completed' && g.selectedShipping && !g.isPosted).length;
  const postedItems = photoGroups.filter(g => g.isPosted).length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">🤖 AI Analysis Queue ({photoGroups.length} items)</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {isAnalyzing && (
            <div className="text-blue-600 font-medium text-sm sm:text-base">
              AI Analysis in progress...
            </div>
          )}
          
          {/* Show Configure Shipping button when there are completed items */}
          {completedItems > 0 && onProceedToShipping && (
            <Button 
              onClick={onProceedToShipping}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
              size="lg"
            >
              📦 Configure Shipping ({completedItems} items)
            </Button>
          )}

          {/* Show Post All button when items are ready to post */}
          {readyToPost > 0 && (
            <Button 
              onClick={onPostAll}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base"
              size="lg"
            >
              🚀 Post All Ready ({readyToPost} items)
            </Button>
          )}

          {/* Show View Inventory button when items have been posted */}
          {postedItems > 0 && onViewInventory && (
            <Button 
              onClick={onViewInventory}
              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto text-sm sm:text-base"
              size="lg"
            >
              📋 View Inventory ({postedItems} posted)
            </Button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      {completedItems > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
            <span className="text-blue-800 font-medium">
              ✅ {completedItems} items analyzed and ready
            </span>
            {readyForShipping > 0 && (
              <span className="text-orange-600">
                📦 {readyForShipping} need shipping configuration
              </span>
            )}
            {readyToPost > 0 && (
              <span className="text-green-600">
                🚀 {readyToPost} ready to post
              </span>
            )}
            {postedItems > 0 && (
              <span className="text-purple-600">
                📋 {postedItems} items posted to inventory
              </span>
            )}
          </div>
        </div>
      )}
      
      <AIDetailsTableView
        photoGroups={photoGroups}
        onEditItem={onEditItem}
        onPreviewItem={handlePreviewClick}
        onPostItem={onPostItem}
        onRunAI={handleRunAI}
        isAnalyzing={isAnalyzing}
      />

      <EnhancedPreviewDialog
        group={previewGroup}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSave={handlePreviewSave}
      />
    </div>
  );
};

export default BulkReviewDashboard;
