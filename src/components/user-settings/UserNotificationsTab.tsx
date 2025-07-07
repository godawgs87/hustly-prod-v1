
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell } from 'lucide-react';

const UserNotificationsTab = () => {
  const [notifications, setNotifications] = useState(true);

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="listing-notifications">Listing Updates</Label>
            <p className="text-sm text-gray-600">Get notified when your listings are viewed or sold</p>
          </div>
          <Switch
            id="listing-notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="price-alerts">Price Alerts</Label>
            <p className="text-sm text-gray-600">Get notified about market price changes for your items</p>
          </div>
          <Switch id="price-alerts" />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="inventory-reminders">Inventory Reminders</Label>
            <p className="text-sm text-gray-600">Weekly reminders to update stale listings</p>
          </div>
          <Switch id="inventory-reminders" />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-digest">Weekly Email Digest</Label>
            <p className="text-sm text-gray-600">Summary of your selling activity and performance</p>
          </div>
          <Switch id="email-digest" defaultChecked />
        </div>
      </div>
    </Card>
  );
};

export default UserNotificationsTab;
