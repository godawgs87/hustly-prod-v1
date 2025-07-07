import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPage from '@/pages/AuthPage';

const AuthWrapper = () => {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthPage onAuthSuccess={handleAuthSuccess} />
  );
};

export default AuthWrapper;