import React from 'react';
import { Badge } from '@/components/ui/badge';

interface InventoryStatusNotificationsProps {
  usingFallback: boolean;
  isLoading: boolean;
  hasListings: boolean;
}

const InventoryStatusNotifications = ({ 
  usingFallback, 
  isLoading, 
  hasListings 
}: InventoryStatusNotificationsProps) => {
  return (
    <>
      {/* Show fallback warning if using cached data */}
      {usingFallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Cached Data
            </Badge>
            <span className="text-yellow-800 text-sm">
              Showing cached inventory due to connection timeout. Data may not be current.
            </span>
          </div>
        </div>
      )}

      {/* Show loading indicator when refreshing */}
      {isLoading && hasListings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-800 text-sm">Refreshing inventory...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryStatusNotifications;