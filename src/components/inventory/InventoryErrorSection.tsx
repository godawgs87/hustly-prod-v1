
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface InventoryErrorSectionProps {
  error: string;
  onRetry: () => void;
  onClearFilters: () => void;
}

const InventoryErrorSection = ({ 
  error, 
  onRetry, 
  onClearFilters
}: InventoryErrorSectionProps) => {
  return (
    <Card className="p-6 border-red-200 bg-red-50">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Unable to Load Inventory
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onRetry}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={onClearFilters}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Clear Filters & Retry
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-red-600">
            <p><strong>Common solutions:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Check your internet connection</li>
              <li>Try clearing search filters to reduce data load</li>
              <li>Refresh the page if the issue persists</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default InventoryErrorSection;
