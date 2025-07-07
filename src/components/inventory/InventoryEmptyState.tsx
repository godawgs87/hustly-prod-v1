
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InventoryEmptyStateProps {
  onCreateListing: () => void;
}

const InventoryEmptyState = ({ onCreateListing }: InventoryEmptyStateProps) => {
  return (
    <Card className="p-8 text-center">
      <div className="text-gray-500 mb-4">No inventory items found</div>
      <Button onClick={onCreateListing}>
        Create Your First Item
      </Button>
    </Card>
  );
};

export default InventoryEmptyState;
