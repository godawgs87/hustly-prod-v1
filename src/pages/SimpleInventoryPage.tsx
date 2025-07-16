
import React from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryManager from '@/components/inventory/InventoryManager';
import { UsageTracker } from '@/components/layout/UsageTracker';

const SimpleInventoryPage = () => {
  const navigate = useNavigate();

  const handleCreateListing = () => {
    navigate('/create');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="space-y-4">
      <UsageTracker compact={true} className="mx-4 mt-4" />
      <InventoryManager
        onCreateListing={handleCreateListing}
        onBack={handleBack}
      />
    </div>
  );
};

export default SimpleInventoryPage;
