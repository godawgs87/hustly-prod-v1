import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdminOrTester } = useFeatureAccess();

  if (!isAdminOrTester()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;