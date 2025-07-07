
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon } from 'lucide-react';

const UserAdvancedTab = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <SettingsIcon className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Advanced Settings</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label>Data Management</Label>
          <p className="text-sm text-gray-600 mb-3">Manage your account data and privacy</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Export My Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Download Listings Report
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label>Admin Access</Label>
          <p className="text-sm text-gray-600 mb-3">Access advanced admin features</p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/admin'}
            className="w-full justify-start"
          >
            Open Admin Dashboard
          </Button>
        </div>

        <Separator />

        <div>
          <Label className="text-red-600">Danger Zone</Label>
          <p className="text-sm text-gray-600 mb-3">Permanent actions that cannot be undone</p>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UserAdvancedTab;
