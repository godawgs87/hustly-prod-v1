
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap, Webhook } from 'lucide-react';

const UserIntegrationsTab = () => {
  const [automationRules, setAutomationRules] = useState([
    { name: 'Auto-price electronics', active: true, platform: 'All' },
    { name: 'Bulk list to eBay', active: false, platform: 'eBay' },
    { name: 'Cross-list sold items', active: true, platform: 'Multi' }
  ]);

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Zap className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Integrations & Automation</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Automation Rules</Label>
          <p className="text-sm text-gray-600 mb-3">Set up automated workflows for your listings</p>
          <div className="space-y-3">
            {automationRules.map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-gray-600">Platform: {rule.platform}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(checked) => {
                      const newRules = [...automationRules];
                      newRules[index].active = checked;
                      setAutomationRules(newRules);
                    }}
                  />
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              + Create New Rule
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Third-Party Apps</Label>
          <p className="text-sm text-gray-600 mb-3">Connect external tools and services</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  ZP
                </div>
                <div>
                  <p className="font-medium">Zapier</p>
                  <p className="text-sm text-gray-600">Workflow automation</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Connected</Badge>
                <Button variant="outline" size="sm">Settings</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  SL
                </div>
                <div>
                  <p className="font-medium">Slack</p>
                  <p className="text-sm text-gray-600">Team notifications</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  DS
                </div>
                <div>
                  <p className="font-medium">Discord</p>
                  <p className="text-sm text-gray-600">Community notifications</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Webhooks</Label>
          <p className="text-sm text-gray-600 mb-3">Configure webhook endpoints for real-time updates</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Webhook className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Listing Updates</p>
                  <p className="text-sm text-gray-600">https://api.yoursite.com/webhooks</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">Active</Badge>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              + Add Webhook
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Import/Export Preferences</Label>
          <p className="text-sm text-gray-600 mb-3">Configure data import and export settings</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="export-format">Default Export Format</Label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="json">JSON</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-backup listings</Label>
                <p className="text-sm text-gray-600">Weekly automatic export of all listings</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Include photos in exports</Label>
                <p className="text-sm text-gray-600">Export photo URLs with listing data</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserIntegrationsTab;
