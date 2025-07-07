import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';

interface InventoryActionsBarProps {
  loading: boolean;
  onRefresh: () => void;
  onCreateListing: () => void;
}

const InventoryActionsBar = ({
  loading,
  onRefresh,
  onCreateListing
}: InventoryActionsBarProps) => {
  return (
    <>
      <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      <Button onClick={onCreateListing} className="bg-primary hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </>
  );
};

export default InventoryActionsBar;