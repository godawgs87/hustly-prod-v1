
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface IndividualReviewHeaderProps {
  group: PhotoGroup;
  currentIndex: number;
  totalItems: number;
}

const IndividualReviewHeader = ({
  group,
  currentIndex,
  totalItems
}: IndividualReviewHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="text-center flex-1">
        <span className="text-xs text-gray-600 block">
          Item {currentIndex + 1} of {totalItems}
        </span>
        <h1 className="text-lg md:text-xl font-bold truncate">
          {group.listingData?.title || group.name || 'Untitled Item'}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={`text-xs px-2 py-1 rounded ${
            group.confidence === 'high' ? 'bg-green-100 text-green-700' :
            group.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {group.confidence} confidence
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            group.status === 'completed' ? 'bg-green-100 text-green-700' :
            group.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            group.status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {group.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IndividualReviewHeader;
