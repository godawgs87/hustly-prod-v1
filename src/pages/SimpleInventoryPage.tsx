
import React from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryManager from '@/components/inventory/InventoryManager';
import { UsageBanner } from '@/components/usage/UsageBanner';

const SimpleInventoryPage = () => {
  const navigate = useNavigate();

  const handleCreateListing = () => {
    navigate('/create');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div>
      <UsageBanner />
      <InventoryManager
        onCreateListing={handleCreateListing}
        onBack={handleBack}
      />
    </div>
  );
};

export default SimpleInventoryPage;
