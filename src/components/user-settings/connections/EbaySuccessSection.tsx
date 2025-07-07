import React from 'react';
import { Button } from '@/components/ui/button';

interface EbaySuccessSectionProps {
  onImportTrainingData: () => void;
  importing: boolean;
}

export const EbaySuccessSection: React.FC<EbaySuccessSectionProps> = ({
  onImportTrainingData,
  importing
}) => {
  return (
    <div className="mt-4 pl-11 space-y-4">
      <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            ✓
          </div>
          <div>
            <p className="font-medium text-green-900">eBay Connected</p>
            <p className="text-sm text-green-700">Ready to sync listings and import data</p>
          </div>
        </div>
        <Button 
          onClick={onImportTrainingData}
          disabled={importing}
          size="sm"
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-100"
        >
          {importing ? 'Importing...' : 'Import Training Data'}
        </Button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">What happens next:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• AI will analyze your successful sales patterns</li>
          <li>• Auto-generate listings that match your style</li>
          <li>• Sync inventory and pricing across platforms</li>
          <li>• Track performance and optimize listings</li>
        </ul>
      </div>
    </div>
  );
};