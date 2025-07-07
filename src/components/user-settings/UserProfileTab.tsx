
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

interface UserProfileTabProps {
  user: any;
}

const UserProfileTab = ({ user }: UserProfileTabProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{user?.email}</h2>
          <p className="text-gray-600">Your account information</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="mt-1 bg-gray-50"
          />
          <p className="text-sm text-gray-500 mt-1">Contact support to change your email</p>
        </div>

        <div>
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            placeholder="Enter your display name"
            className="mt-1"
          />
        </div>

        <Button className="bg-blue-600 hover:bg-blue-700">
          Save Profile Changes
        </Button>
      </div>
    </Card>
  );
};

export default UserProfileTab;
