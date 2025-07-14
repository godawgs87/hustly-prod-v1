import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const { isAdminOrTester } = useFeatureAccess();

  // If user is not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is not admin/tester, redirect to home
  if (!isAdminOrTester()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;