
import React from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryManager from '@/components/inventory/InventoryManager';

const SimpleInventoryPage = () => {
  const navigate = useNavigate();

  const handleCreateListing = () => {
    navigate('/create');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <InventoryManager
      onCreateListing={handleCreateListing}
      onBack={handleBack}
    />
  );
};

export default SimpleInventoryPage;
