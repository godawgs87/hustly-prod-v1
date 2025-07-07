
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Palette } from 'lucide-react';

const UserAppearanceTab = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [defaultView, setDefaultView] = useState('grid');

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Palette className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Display Preferences</h3>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <p className="text-sm text-gray-600">Use dark theme throughout the app</p>
          </div>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        <Separator />

        <div>
          <Label>Default Inventory View</Label>
          <p className="text-sm text-gray-600 mb-3">Choose how you want to see your listings by default</p>
          <div className="flex space-x-2">
            <Button 
              variant={defaultView === 'grid' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setDefaultView('grid')}
            >
              Grid View
            </Button>
            <Button 
              variant={defaultView === 'table' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setDefaultView('table')}
            >
              Table View
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label>Items Per Page</Label>
          <p className="text-sm text-gray-600 mb-3">How many listings to show at once</p>
          <select className="w-full p-2 border rounded-md">
            <option value="12">12 items</option>
            <option value="24">24 items</option>
            <option value="48">48 items</option>
          </select>
        </div>
      </div>
    </Card>
  );
};

export default UserAppearanceTab;
