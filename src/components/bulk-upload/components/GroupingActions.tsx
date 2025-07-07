
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Merge, Split, Eye } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface GroupingActionsProps {
  groups: PhotoGroup[];
  onMergeGroups: (groupIds: string[]) => void;
  onSplitGroup: (groupId: string) => void;
  onReviewGrouping: () => void;
}

const GroupingActions = ({
  groups,
  onMergeGroups,
  onSplitGroup,
  onReviewGrouping
}: GroupingActionsProps) => {
  // Detect potential grouping issues
  const singlePhotoGroups = groups.filter(g => g.photos.length === 1);
  const hasGroupingIssues = singlePhotoGroups.length > 1;
  
  // Find groups that might be the same item (same name pattern or taken close together)
  const potentialDuplicates = singlePhotoGroups.filter((group, index, arr) => {
    return arr.some((other, otherIndex) => 
      index !== otherIndex && 
      group.name.toLowerCase().includes('similar') || 
      other.name.toLowerCase().includes('similar')
    );
  });

  if (!hasGroupingIssues) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 mb-2">Potential Grouping Issues Detected</h3>
            
            {singlePhotoGroups.length > 1 && (
              <div className="mb-3">
                <p className="text-sm text-yellow-800 mb-2">
                  Found {singlePhotoGroups.length} groups with only 1 photo each. These might be the same item:
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {singlePhotoGroups.slice(0, 4).map((group) => (
                    <div key={group.id} className="flex items-center gap-2 bg-white px-2 py-1 rounded text-xs">
                      <div className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                        {group.photos[0] && (
                          <img
                            src={URL.createObjectURL(group.photos[0])}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="truncate max-w-24">{group.name}</span>
                    </div>
                  ))}
                  {singlePhotoGroups.length > 4 && (
                    <span className="text-xs text-yellow-700">
                      +{singlePhotoGroups.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => onMergeGroups(singlePhotoGroups.map(g => g.id))}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Merge className="w-4 h-4 mr-1" />
                Smart Merge Similar
              </Button>
              
              <Button
                onClick={onReviewGrouping}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <Eye className="w-4 h-4 mr-1" />
                Review All Groups
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupingActions;
