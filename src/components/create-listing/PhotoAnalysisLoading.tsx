
import React from 'react';
import { Card } from '@/components/ui/card';

const PhotoAnalysisLoading = () => {
  return (
    <Card className="p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <h3 className="text-lg font-medium mb-2">Analyzing Your Photos...</h3>
      <p className="text-gray-600 text-sm">
        Our AI is identifying the item, extracting measurements, and generating your listing.
      </p>
    </Card>
  );
};

export default PhotoAnalysisLoading;
