import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface InventoryConnectionStatusProps {
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  itemCount: number;
  onRetry: () => void;
}

const InventoryConnectionStatus = ({ 
  loading, 
  error, 
  usingFallback, 
  itemCount,
  onRetry 
}: InventoryConnectionStatusProps) => {
  if (!loading && !error && !usingFallback) {
    return (
      <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Live data ({itemCount} items)
      </Badge>
    );
  }

  if (loading && !error) {
    return (
      <Badge variant="secondary" className="text-blue-700 bg-blue-50 border-blue-200">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    );
  }

  if (usingFallback && error) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-orange-700 bg-orange-50 border-orange-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Cached data ({itemCount} items)
        </Badge>
        <button 
          onClick={onRetry}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Retry connection
        </button>
      </div>
    );
  }

  if (error && !usingFallback) {
    return (
      <Badge variant="destructive" className="cursor-pointer" onClick={onRetry}>
        <AlertCircle className="w-3 h-3 mr-1" />
        Connection failed - Click to retry
      </Badge>
    );
  }

  return null;
};

export default InventoryConnectionStatus;