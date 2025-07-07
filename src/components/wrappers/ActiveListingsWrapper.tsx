import React from 'react';
import { useNavigate } from 'react-router-dom';
import ActiveListingsPage from '@/pages/ActiveListingsPage';

const ActiveListingsWrapper = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/', { replace: false });
  };

  return (
    <ActiveListingsPage onBack={handleBack} />
  );
};

export default ActiveListingsWrapper;