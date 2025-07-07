
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserProfileTab from './UserProfileTab';
import UserConnectionsTab from './UserConnectionsTab';
import UserFinancialsTab from './UserFinancialsTab';
import UserBillingTab from './UserBillingTab';
import UserPersonalizationTab from './UserPersonalizationTab';
import UserNotificationsTab from './UserNotificationsTab';
import UserSecurityTab from './UserSecurityTab';
import UserBusinessTab from './UserBusinessTab';
import UserIntegrationsTab from './UserIntegrationsTab';
import UserSupportTab from './UserSupportTab';

interface UserSettingsTabsProps {
  user: any;
}

const UserSettingsTabs = ({ user }: UserSettingsTabsProps) => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-1 h-auto p-1">
        <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
        <TabsTrigger value="connections" className="text-xs">Connections</TabsTrigger>
        <TabsTrigger value="financials" className="text-xs">Financials</TabsTrigger>
        <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
        <TabsTrigger value="personalization" className="text-xs">Design</TabsTrigger>
        <TabsTrigger value="notifications" className="text-xs">Alerts</TabsTrigger>
        <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
        <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
        <TabsTrigger value="integrations" className="text-xs">Automation</TabsTrigger>
        <TabsTrigger value="support" className="text-xs">Support</TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile" className="mt-6">
        <UserProfileTab user={user} />
      </TabsContent>
      
      <TabsContent value="connections" className="mt-6">
        <UserConnectionsTab />
      </TabsContent>
      
      <TabsContent value="financials" className="mt-6">
        <UserFinancialsTab />
      </TabsContent>
      
      <TabsContent value="billing" className="mt-6">
        <UserBillingTab />
      </TabsContent>
      
      <TabsContent value="personalization" className="mt-6">
        <UserPersonalizationTab />
      </TabsContent>
      
      <TabsContent value="notifications" className="mt-6">
        <UserNotificationsTab />
      </TabsContent>
      
      <TabsContent value="security" className="mt-6">
        <UserSecurityTab />
      </TabsContent>
      
      <TabsContent value="business" className="mt-6">
        <UserBusinessTab />
      </TabsContent>
      
      <TabsContent value="integrations" className="mt-6">
        <UserIntegrationsTab />
      </TabsContent>
      
      <TabsContent value="support" className="mt-6">
        <UserSupportTab />
      </TabsContent>
    </Tabs>
  );
};

export default UserSettingsTabs;
