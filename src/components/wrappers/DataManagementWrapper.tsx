import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataManagement from '@/pages/DataManagement';

const DataManagementWrapper = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/', { replace: false });
  };

  const handleNavigate = (view: 'dashboard' | 'create' | 'inventory' | 'active-listings') => {
    const routes = {
      dashboard: '/',
      create: '/create',
      inventory: '/inventory',
      'active-listings': '/active-listings'
    };
    navigate(routes[view], { replace: false });
  };

  return (
    <DataManagement 
      onBack={handleBack}
      onNavigate={handleNavigate}
    />
  );
};

export default DataManagementWrapper;