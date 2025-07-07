
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Upload } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface ReviewDashboardItemProps {
  group: PhotoGroup;
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostItem: (groupId: string) => void;
}

const ReviewDashboardItem = ({
  group,
  onEditItem,
  onPreviewItem,
  onPostItem
}: ReviewDashboardItemProps) => {
  const getStatusBadge = () => {
    if (group.isPosted) {
      return <Badge className="bg-green-100 text-green-800">📤 Posted</Badge>;
    }
    
    switch (group.status) {
      case 'completed':
        return group.selectedShipping 
          ? <Badge className="bg-green-100 text-green-800">✅ Ready</Badge>
          : <Badge className="bg-yellow-100 text-yellow-800">⚠️ Review</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">🔄 Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">❌ Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">⏳ Pending</Badge>;
    }
  };

  const canPost = group.status === 'completed' && group.selectedShipping && !group.isPosted;

  return (
    <Card className="w-full">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Photo Preview */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100">
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

          {/* Item Details */}
          <div className="flex-grow min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-grow">
                <h3 className="font-medium text-sm sm:text-base truncate">{group.name}</h3>
                <p className="text-xs text-gray-500">
                  {group.photos?.length || 0} photo{(group.photos?.length || 0) !== 1 ? 's' : ''}
                </p>
                {group.listingData?.price && (
                  <p className="text-sm font-medium text-green-600">
                    ${group.listingData.price}
                  </p>
                )}
                {group.selectedShipping && (
                  <p className="text-xs text-blue-600">
                    Shipping: ${group.selectedShipping.cost}
                  </p>
                )}
              </div>
              
              <div className="flex-shrink-0">
                {getStatusBadge()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditItem(group.id)}
                className="text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreviewItem(group.id)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewDashboardItem;
