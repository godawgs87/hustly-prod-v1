
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import Index from '@/pages/Index';
import AuthWrapper from '@/components/wrappers/AuthWrapper';
import CreateListingWrapper from '@/components/wrappers/CreateListingWrapper';
import DataManagementWrapper from '@/components/wrappers/DataManagementWrapper';
import UserSettings from '@/pages/UserSettings';
import SimpleInventoryPage from '@/pages/SimpleInventoryPage';
import ActiveListingsWrapper from '@/components/wrappers/ActiveListingsWrapper';
import EbayCallback from '@/pages/EbayCallback';
import SafeErrorBoundary from '@/components/SafeErrorBoundary';
import UniversalOnboardingFlow from '@/components/onboarding/UniversalOnboardingFlow';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminRoute from '@/components/admin/AdminRoute';

const AppContent = () => {
  const { needsOnboarding, markOnboardingComplete, currentStep, saveCurrentStep, loadSavedStep } = useOnboardingStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route path="/inventory" element={<SimpleInventoryPage />} />
        <Route path="/create" element={<CreateListingWrapper />} />
        <Route path="/active-listings" element={<ActiveListingsWrapper />} />
        <Route path="/data-management" element={<DataManagementWrapper />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/ebay/callback" element={<EbayCallback />} />
        <Route path="*" element={<Index />} />
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
