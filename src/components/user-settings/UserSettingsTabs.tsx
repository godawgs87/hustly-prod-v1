
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const UserSettingsTabs = ({ user }: UserSettingsTabsProps) => {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
        <TabsTrigger value="account" className="text-xs">Account</TabsTrigger>
        <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
        <TabsTrigger value="platforms" className="text-xs">Platforms</TabsTrigger>
        <TabsTrigger value="billing" className="text-xs">Billing & Finance</TabsTrigger>
        <TabsTrigger value="automation" className="text-xs">Automation</TabsTrigger>
        <TabsTrigger value="preferences" className="text-xs">Preferences</TabsTrigger>
      </TabsList>
      
      <TabsContent value="account" className="mt-6">
        <UserAccountTab />
      </TabsContent>
      
      <TabsContent value="business" className="mt-6">
        <UserBusinessTab />
      </TabsContent>
      
      <TabsContent value="platforms" className="mt-6">
        <UserConnectionsTab />
      </TabsContent>
      
      <TabsContent value="billing" className="mt-6">
        <UserBillingFinanceTab />
      </TabsContent>
      
      <TabsContent value="automation" className="mt-6">
        <UserIntegrationsTab />
      </TabsContent>
      
      <TabsContent value="preferences" className="mt-6">
        <div className="space-y-6">
          <UserPersonalizationTab />
          <UserNotificationsTab />
          <UserSupportTab />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default UserSettingsTabs;
