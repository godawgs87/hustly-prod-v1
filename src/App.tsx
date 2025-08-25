import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/admin/AdminRoute';
import SafeErrorBoundary from '@/components/SafeErrorBoundary';

// Page imports
import Dashboard from '@/pages/Dashboard';
import PasswordReset from '@/pages/PasswordReset';
import SimpleInventoryPage from '@/pages/SimpleInventoryPage';
import CreateListing from '@/pages/CreateListing';
import UserSettings from '@/pages/UserSettings';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import AdminDashboard from '@/pages/AdminDashboard';
import EbayCallback from '@/pages/EbayCallback';
import AlertsPage from '@/pages/AlertsPage';
import PricingPage from '@/pages/PricingPage';
import ShippingPage from '@/pages/ShippingPage';
import AuthWrapper from '@/components/wrappers/AuthWrapper';
import ActiveListingsWrapper from '@/components/wrappers/ActiveListingsWrapper';
import DataManagementWrapper from '@/components/wrappers/DataManagementWrapper';
import UniversalOnboardingFlow from '@/components/onboarding/UniversalOnboardingFlow';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

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
