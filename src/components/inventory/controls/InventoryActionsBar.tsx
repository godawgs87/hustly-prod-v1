import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import EbaySyncIntegration from '../EbaySyncIntegration';

interface InventoryActionsBarProps {
  loading: boolean;
  onRefresh: () => void;
  onCreateListing: () => void;
  selectedListings?: any[];
  onSyncComplete?: () => void;
}

const InventoryActionsBar = ({
  loading,
  onRefresh,
  onCreateListing,
  selectedListings = [],
  onSyncComplete = () => {}
}: InventoryActionsBarProps) => {
  return (
    <>
      <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      <EbaySyncIntegration 
        selectedListings={selectedListings}
        onSyncComplete={onSyncComplete}
      />

      <Button onClick={onCreateListing} className="bg-primary hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </>
  );
};

export default InventoryActionsBar;