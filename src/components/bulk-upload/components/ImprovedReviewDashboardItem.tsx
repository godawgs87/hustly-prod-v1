
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Upload, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface ImprovedReviewDashboardItemProps {
  group: PhotoGroup;
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostItem: (groupId: string) => void;
  onRetryAnalysis?: (groupId: string) => void;
}

const ImprovedReviewDashboardItem = ({
  group,
  onEditItem,
  onPreviewItem,
  onPostItem,
  onRetryAnalysis
}: ImprovedReviewDashboardItemProps) => {
  const getStatusInfo = () => {
    if (group.isPosted) {
      return { 
        icon: <CheckCircle className="w-4 h-4" />, 
        text: 'Posted', 
        color: 'bg-green-100 text-green-800 border-green-200' 
      };
    }
    
    switch (group.status) {
      case 'completed':
        return group.selectedShipping 
          ? { 
              icon: <CheckCircle className="w-4 h-4" />, 
              text: 'Ready to Post', 
              color: 'bg-green-100 text-green-800 border-green-200' 
            }
          : { 
              icon: <AlertTriangle className="w-4 h-4" />, 
              text: 'Needs Shipping', 
              color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
            };
      case 'processing':
        return { 
          icon: <Clock className="w-4 h-4 animate-spin" />, 
          text: 'Processing', 
          color: 'bg-blue-100 text-blue-800 border-blue-200' 
        };
      case 'error':
        return { 
          icon: <AlertTriangle className="w-4 h-4" />, 
          text: 'Analysis Failed', 
          color: 'bg-red-100 text-red-800 border-red-200' 
        };
      default:
        return { 
          icon: <Clock className="w-4 h-4" />, 
          text: 'Pending', 
          color: 'bg-gray-100 text-gray-800 border-gray-200' 
        };
    }
  };

  const statusInfo = getStatusInfo();
  const canPost = group.status === 'completed' && group.selectedShipping && !group.isPosted;
  const hasBasicInfo = group.listingData?.title && group.listingData?.price;
  const hasMeasurements = group.listingData?.measurements?.weight;

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo Preview */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">
              {group.photos && group.photos.length > 0 ? (
                <img
                  src={URL.createObjectURL(group.photos[0])}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                  No Photo
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base truncate mb-1">
                  {group.listingData?.title || group.name}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <span>{group.photos?.length || 0} photos</span>
                  {group.listingData?.price && (
                    <span className="font-medium text-green-600">
                      ${group.listingData.price}
                    </span>
                  )}
                  {group.listingData?.condition && (
                    <span className="text-gray-500">{group.listingData.condition}</span>
                  )}
                </div>
              </div>
              
              <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                {statusInfo.icon}
                {statusInfo.text}
              </Badge>
            </div>

            {/* Progress Indicators */}
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1 ${hasBasicInfo ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${hasBasicInfo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Basic Info
                </div>
                <div className={`flex items-center gap-1 ${hasMeasurements ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${hasMeasurements ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Measurements
                </div>
                <div className={`flex items-center gap-1 ${group.selectedShipping ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${group.selectedShipping ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Shipping
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreviewItem(group.id)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditItem(group.id)}
                className="text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>

              {group.status === 'error' && onRetryAnalysis && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryAnalysis(group.id)}
                  className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              
              {canPost && (
                <Button
                  size="sm"
                  onClick={() => onPostItem(group.id)}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Post
                </Button>
              )}
            </div>

            {/* Additional Info */}
            {group.selectedShipping && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Shipping: {group.selectedShipping.name} - ${group.selectedShipping.cost}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovedReviewDashboardItem;
