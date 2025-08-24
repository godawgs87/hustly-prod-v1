import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/integrations/supabase/auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { SafeErrorBoundary } from '@/components/SafeErrorBoundary';
import { EbayTokenRefreshManager } from '@/lib/ebay-token-refresh';
import { BUILD_ID } from '@/lib/build-id';

// Page imports
import Dashboard from '@/pages/Dashboard';
import AuthWrapper from '@/pages/AuthWrapper';
import PasswordReset from '@/pages/PasswordReset';
import SimpleInventoryPage from '@/pages/SimpleInventoryPage';
import CreateListing from '@/pages/CreateListing';
import ActiveListingsWrapper from '@/pages/ActiveListingsWrapper';
import DataManagementWrapper from '@/pages/DataManagementWrapper';
import UserSettings from '@/pages/UserSettings';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import AdminDashboard from '@/pages/AdminDashboard';
import EbayCallback from '@/pages/EbayCallback';
import AlertsPage from '@/pages/AlertsPage';
import PricingPage from '@/pages/PricingPage';
import ShippingPage from '@/pages/ShippingPage';

// Component imports
import { UniversalOnboardingFlow } from '@/components/onboarding/UniversalOnboardingFlow';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';

const AppContent = () => {
  const { needsOnboarding, markOnboardingComplete } = useOnboardingStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/inventory" element={<ProtectedRoute><SimpleInventoryPage /></ProtectedRoute>} />
        <Route path="/create-listing" element={<ProtectedRoute><CreateListing onBack={() => {}} onViewListings={() => {}} /></ProtectedRoute>} />
        <Route path="/active-listings" element={<ProtectedRoute><ActiveListingsWrapper /></ProtectedRoute>} />
        <Route path="/data-management" element={<ProtectedRoute><DataManagementWrapper /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><SubscriptionPlans /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
        <Route path="/ebay/callback" element={<EbayCallback />} />
        <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
        <Route path="/shipping" element={<ProtectedRoute><ShippingPage /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
      <Toaster />
      
      <UniversalOnboardingFlow
        isOpen={needsOnboarding}
        onComplete={markOnboardingComplete}
      />
    </div>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize eBay token refresh manager when app loads
    console.log('🚀 Initializing eBay token refresh manager...');
    EbayTokenRefreshManager.initialize();
    console.log('BUILD_ID:', BUILD_ID);

    // Cleanup on unmount
    return () => {
      EbayTokenRefreshManager.cleanup();
    };
  }, []);

  return (
    <SafeErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </SafeErrorBoundary>
  );
};

export default App;
