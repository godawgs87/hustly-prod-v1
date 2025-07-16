
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import SalesOperationsManager from '@/components/active-listings/SalesOperationsManager';
import { UsageTracker } from '@/components/layout/UsageTracker';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ActiveListingsPageProps {
  onBack: () => void;
}

const ActiveListingsPage = ({ onBack }: ActiveListingsPageProps) => {
  const isMobile = useIsMobile();

  const handleNavigateToInventory = () => {
    // Navigate to inventory management
    window.location.href = '/inventory';
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Sales Operations"
        showBack
        onBack={onBack}
      />
      
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <UsageTracker compact={true} />
        <SalesOperationsManager 
          onNavigateToInventory={handleNavigateToInventory}
        />
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="active-listings"
          onNavigate={() => {}}
          showBack
          onBack={onBack}
          title="Sales Operations"
        />
      )}
    </div>
  );
};

export default ActiveListingsPage;
