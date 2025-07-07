
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PhotoGroup } from '../BulkUploadManager';

interface ReviewDashboardHeaderProps {
  photoGroups: PhotoGroup[];
  onPostAll: () => void;
  onReviewAll: () => void;
  onSaveDraft: () => void;
}

const ReviewDashboardHeader = ({
  photoGroups,
  onPostAll,
  onReviewAll,
  onSaveDraft
}: ReviewDashboardHeaderProps) => {
  const readyToPost = photoGroups.filter(group => 
    group.status === 'completed' && group.selectedShipping && !group.isPosted
  );
  const needsReview = photoGroups.filter(group => 
    group.status === 'completed' && !group.selectedShipping
  );
  const hasIssues = photoGroups.filter(group => group.status === 'error');

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-lg md:text-xl">
            📊 Review Dashboard - {photoGroups.length} Items
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <Badge className="bg-green-100 text-green-800">
              ✅ {readyToPost.length} Ready
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800">
              ⚠️ {needsReview.length} Review
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              ❌ {hasIssues.length} Issues
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
          <Button 
            onClick={onPostAll}
            disabled={readyToPost.length === 0}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            Post All Ready ({readyToPost.length})
          </Button>
          <Button variant="outline" onClick={onReviewAll} className="w-full sm:w-auto">
            Quick Review All
          </Button>
          <Button variant="outline" onClick={onSaveDraft} className="w-full sm:w-auto">
            Save Draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewDashboardHeader;
