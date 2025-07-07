import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateListing from '@/pages/CreateListing';

const CreateListingWrapper = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/', { replace: false });
  };

  const handleViewListings = () => {
    navigate('/inventory', { replace: false });
  };

  return (
    <CreateListing 
      onBack={handleBack}
      onViewListings={handleViewListings}
    />
  );
};

export default CreateListingWrapper;