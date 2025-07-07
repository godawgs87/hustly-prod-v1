
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2, Eye } from 'lucide-react';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkProcessingStatusProps {
  photoGroups: PhotoGroup[];
  results: any[];
  onComplete: () => void;
  onBack: () => void;
}

const BulkProcessingStatus = ({ photoGroups, results, onComplete, onBack }: BulkProcessingStatusProps) => {
  const getStatusIcon = (status: PhotoGroup['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: PhotoGroup['status']) => {
    switch (status) {
      case 'pending': return 'Waiting';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
    }
  };

  const getStatusColor = (status: PhotoGroup['status']) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
    }
  };

  const completedCount = photoGroups.filter(g => g.status === 'completed').length;
  const errorCount = photoGroups.filter(g => g.status === 'error').length;
  const processingCount = photoGroups.filter(g => g.status === 'processing').length;
  const totalCount = photoGroups.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const isAllComplete = completedCount === totalCount;
  const hasErrors = errorCount > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bulk Processing Status</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {completedCount} Completed
              </Badge>
              {processingCount > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {processingCount} Processing
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  {errorCount} Errors
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progress)}% ({completedCount}/{totalCount})</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="space-y-3">
              {photoGroups.map((group) => (
                <Card key={group.id} className="border-l-4" style={{
                  borderLeftColor: getStatusColor(group.status) === 'green' ? '#10b981' :
                                   getStatusColor(group.status) === 'blue' ? '#3b82f6' :
                                   getStatusColor(group.status) === 'red' ? '#ef4444' : '#6b7280'
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(group.status)}
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          <p className="text-sm text-gray-600">{group.photos.length} photos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`bg-${getStatusColor(group.status)}-50 text-${getStatusColor(group.status)}-700`}>
                          {getStatusText(group.status)}
                        </Badge>
                        {group.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isAllComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800 mb-1">All Items Processed!</h3>
                <p className="text-sm text-green-700">
                  {completedCount} listings have been created successfully
                  {hasErrors && ` (${errorCount} had errors)`}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onBack}>
                Back to Grouping
              </Button>
              <div className="space-x-2">
                {hasErrors && (
                  <Button variant="outline">
                    Retry Failed ({errorCount})
                  </Button>
                )}
                <Button 
                  onClick={onComplete}
                  disabled={!isAllComplete}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View All Listings ({completedCount})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkProcessingStatus;
