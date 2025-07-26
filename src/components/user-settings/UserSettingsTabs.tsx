import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import UserAccountTab from './UserAccountTab';
import UserConnectionsTab from './UserConnectionsTab';
import UserBillingFinanceTab from './UserBillingFinanceTab';
import UserPersonalizationTab from './UserPersonalizationTab';
import UserNotificationsTab from './UserNotificationsTab';
import UserBusinessTab from './UserBusinessTab';
import UserIntegrationsTab from './UserIntegrationsTab';
import UserSupportTab from './UserSupportTab';

interface UserSettingsTabsProps {
  user: any;
}

// Error boundary wrapper for individual tabs
const TabErrorBoundary = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [children]);

  if (hasError) {
    return fallback || (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Something went wrong loading this tab.</p>
          <button 
            onClick={() => setHasError(false)}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Tab error:', error);
    setHasError(true);
    return null;
  }
};

const UserSettingsTabs = ({ user }: UserSettingsTabsProps) => {
  const [activeTab, setActiveTab] = useState("account");
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({});

  // Handle tab loading states
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (!loadingTabs[value]) {
      setLoadingTabs(prev => ({ ...prev, [value]: true }));
      // Simulate loading completion
      setTimeout(() => {
        setLoadingTabs(prev => ({ ...prev, [value]: false }));
      }, 100);
    }
  };

  // Loading component for tabs
  const TabLoading = () => (
    <Card>
      <CardContent className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-gray-600">Loading...</p>
      </CardContent>
    </Card>
  );

  // Ensure user exists before rendering tabs
  if (!user) {
    return <TabLoading />;
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="account" className="text-xs">Account</TabsTrigger>
          <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs">Platforms</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">Billing & Finance</TabsTrigger>
          <TabsTrigger value="automation" className="text-xs">Automation</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs">Preferences</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="account" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.account ? <TabLoading /> : <UserAccountTab />}
            </TabErrorBoundary>
          </TabsContent>
          
          <TabsContent value="business" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.business ? <TabLoading /> : <UserBusinessTab />}
            </TabErrorBoundary>
          </TabsContent>
          
          <TabsContent value="platforms" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.platforms ? <TabLoading /> : <UserConnectionsTab />}
            </TabErrorBoundary>
          </TabsContent>
          
          <TabsContent value="billing" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.billing ? <TabLoading /> : <UserBillingFinanceTab />}
            </TabErrorBoundary>
          </TabsContent>
          
          <TabsContent value="automation" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.automation ? <TabLoading /> : <UserIntegrationsTab />}
            </TabErrorBoundary>
          </TabsContent>
          
          <TabsContent value="preferences" className="mt-0">
            <TabErrorBoundary>
              {loadingTabs.preferences ? (
                <TabLoading />
              ) : (
                <div className="space-y-6">
                  <UserPersonalizationTab />
                  <UserNotificationsTab />
                  <UserSupportTab />
                </div>
              )}
            </TabErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default UserSettingsTabs;
