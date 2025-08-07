import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Brain, 
  ArrowLeft, 
  ArrowRight,
  Zap,
  CheckCircle,
  Edit,
  Eye
} from 'lucide-react';
import { PhotoGroup } from './BulkUploadManager';
import { useCascadeProcessor } from './hooks/useCascadeProcessor';
import { CascadeProgressIndicator } from './components/CascadeProgressIndicator';
import { validateEbayConnection } from '@/utils/ebayConnectionValidator';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedPreviewDialog } from './components/EnhancedPreviewDialog';

interface OptimizedBulkCombinedAnalysisStepProps {
  photoGroups: PhotoGroup[];
  onComplete: (groups: PhotoGroup[]) => void;
  onBack: () => void;
}

export const OptimizedBulkCombinedAnalysisStep: React.FC<OptimizedBulkCombinedAnalysisStepProps> = ({
  photoGroups,
  onComplete,
  onBack
}) => {
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [previewGroup, setPreviewGroup] = useState<PhotoGroup | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { user } = useAuth();

  // Check eBay connection with proper validation
  const { data: ebayConnection, isLoading: isCheckingEbay } = useQuery({
    queryKey: ['ebay-connection-status', user?.id],
    queryFn: validateEbayConnection,
    enabled: !!user,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  const isEbayConnected = ebayConnection?.isConnected && ebayConnection?.isTokenValid;

  // Initialize cascade processor
  const {
    progress,
    completedGroups,
    isProcessing,
    queues,
    startCascadeProcessing,
    retryItem
  } = useCascadeProcessor(isEbayConnected);

  // Start cascade processing when analysis begins
  const handleStartAnalysis = () => {
    console.log('🚀 Starting optimized cascade processing for', photoGroups.length, 'items');
    setAnalysisStarted(true);
    startCascadeProcessing(photoGroups);
    toast.success(`Started cascade processing for ${photoGroups.length} items`);
  };

  // Handle field updates
  const handleFieldUpdate = (groupId: string, field: string, value: any) => {
    // This will be handled by the cascade processor's completed groups
    console.log('Field update:', groupId, field, value);
  };

  // Handle preview
  const handlePreviewItem = (group: PhotoGroup) => {
    setPreviewGroup(group);
    setIsPreviewOpen(true);
  };

  const handlePreviewSave = (updatedGroup: PhotoGroup) => {
    // Update the group in completed groups
    console.log('Preview save:', updatedGroup);
    setIsPreviewOpen(false);
  };

  // Handle continue to shipping
  const handleContinueToShipping = () => {
    const finalGroups = completedGroups.length > 0 ? completedGroups : photoGroups;
    console.log('🚢 Continuing to shipping with', finalGroups.length, 'groups');
    onComplete(finalGroups);
  };

  // Calculate completion status
  const completedCount = progress.filter(p => p.stage === 'save-completed').length;
  const errorCount = progress.filter(p => p.stage === 'error').length;
  const totalCount = photoGroups.length;
  const allCompleted = completedCount + errorCount === totalCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Optimized AI Analysis & Price Research
            <Badge variant="secondary" className="ml-2">
              {photoGroups.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!analysisStarted ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Ready to process {photoGroups.length} items using our optimized cascade pipeline.
                  This new system processes AI analysis, price research, and auto-save in parallel for 3x faster performance.
                </p>
                
                {/* eBay Connection Status */}
                {isCheckingEbay ? (
                  <Badge variant="secondary">Checking eBay connection...</Badge>
                ) : isEbayConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    ✅ eBay Connected - Price research enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    ⚠️ eBay not connected - Price research will be skipped
                  </Badge>
                )}

                <div className="flex justify-center">
                  <Button 
                    onClick={handleStartAnalysis}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-semibold"
                  >
                    <Brain className="w-5 h-5" />
                    Start Cascade Processing
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cascade Progress Indicator */}
                <CascadeProgressIndicator
                  progress={progress}
                  queues={queues}
                  isProcessing={isProcessing}
                  onRetryItem={retryItem}
                  completedGroups={completedGroups}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table (shown after analysis starts) */}
      {analysisStarted && completedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-left p-2 font-medium">Price</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedGroups.map((group, index) => {
                    const itemProgress = progress.find(p => p.groupId === group.id);
                    const thumbnail = group.photos[0] ? URL.createObjectURL(group.photos[0]) : null;
                    
                    return (
                      <tr key={group.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            {thumbnail && (
                              <img 
                                src={thumbnail} 
                                alt={group.name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {group.listingData?.title || group.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {group.photos.length} photo{group.photos.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          {editingGroup === group.id ? (
                            <Input
                              type="number"
                              value={group.listingData?.price || ''}
                              onChange={(e) => handleFieldUpdate(group.id, 'price', parseFloat(e.target.value))}
                              className="w-20"
                              step="0.01"
                            />
                          ) : (
                            <span className="font-medium">
                              ${group.listingData?.price?.toFixed(2) || '0.00'}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="text-sm">
                            {typeof group.listingData?.category === 'string' 
                              ? group.listingData.category 
                              : group.listingData?.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-2">
                          {itemProgress && (
                            <Badge 
                              variant={itemProgress.stage === 'save-completed' ? 'default' : 
                                      itemProgress.stage === 'error' ? 'destructive' : 'secondary'}
                            >
                              {itemProgress.stage === 'save-completed' ? 'Saved' :
                               itemProgress.stage === 'error' ? 'Error' : 'Processing'}
                            </Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingGroup(editingGroup === group.id ? null : group.id)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              {editingGroup === group.id ? 'Save' : 'Edit'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewItem(group)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Preview
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Photo Grouping
        </Button>
        
        {analysisStarted && (
          <Button 
            onClick={handleContinueToShipping}
            disabled={!allCompleted && isProcessing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            Continue to Shipping Configuration
            <ArrowRight className="w-4 h-4" />
            {allCompleted && (
              <CheckCircle className="w-4 h-4 ml-1" />
            )}
          </Button>
        )}
      </div>

      {/* Preview Dialog */}
      {previewGroup && (
        <EnhancedPreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          group={previewGroup}
          onSave={handlePreviewSave}
        />
      )}
    </div>
  );
};
