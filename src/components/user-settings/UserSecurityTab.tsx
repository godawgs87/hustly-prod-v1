
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Download } from 'lucide-react';

const UserSecurityTab = () => {
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Security & Privacy</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Password</Label>
          <p className="text-sm text-gray-600 mb-3">Manage your account password</p>
          <Button variant="outline">Change Password</Button>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <Switch
              id="two-factor"
              checked={twoFactor}
              onCheckedChange={setTwoFactor}
            />
          </div>
          {twoFactor && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">Two-factor authentication is enabled</p>
              <Button variant="outline" size="sm" className="mt-2">
                View Recovery Codes
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">API Keys</Label>
          <p className="text-sm text-gray-600 mb-3">Manage your API access tokens</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Main API Key</p>
                  <p className="text-sm text-gray-600">Created Dec 1, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Active</Badge>
                <Button variant="outline" size="sm">Revoke</Button>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              + Generate New API Key
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Login Activity</Label>
          <p className="text-sm text-gray-600 mb-3">Recent login history and device management</p>
          <div className="space-y-2">
            {[
              { device: 'Chrome on Windows', location: 'New York, NY', time: '2 hours ago', current: true },
              { device: 'Safari on iPhone', location: 'New York, NY', time: '1 day ago', current: false },
              { device: 'Chrome on Mac', location: 'Los Angeles, CA', time: '3 days ago', current: false },
            ].map((session, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{session.device}</p>
                    {session.current && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <p className="text-sm text-gray-600">{session.location} • {session.time}</p>
                </div>
                {!session.current && (
                  <Button variant="outline" size="sm">End Session</Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Data Export & Deletion</Label>
          <p className="text-sm text-gray-600 mb-3">Manage your personal data</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Download Account Information
            </Button>
            <Button variant="destructive" className="w-full">
              Delete My Account
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserSecurityTab;
