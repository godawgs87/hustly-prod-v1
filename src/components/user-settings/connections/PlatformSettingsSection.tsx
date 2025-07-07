import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface Platform {
  name: string;
  connected: boolean;
  autoList: boolean;
  icon: string;
}

interface PlatformSettingsSectionProps {
  platform: Platform;
  index: number;
  platforms: Platform[];
  setPlatforms: React.Dispatch<React.SetStateAction<Platform[]>>;
}

export const PlatformSettingsSection: React.FC<PlatformSettingsSectionProps> = ({
  platform,
  index,
  platforms,
  setPlatforms
}) => {
  const updatePlatformSetting = (field: keyof Platform, value: any) => {
    const newPlatforms = [...platforms];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };
    setPlatforms(newPlatforms);
  };

  if (platform.name === 'eBay') {
    return (
      <div className="mt-4 pl-11 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-listing</Label>
            <p className="text-sm text-gray-600">Automatically list new items</p>
          </div>
          <Switch
            checked={platform.autoList}
            onCheckedChange={(checked) => updatePlatformSetting('autoList', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Price sync</Label>
            <p className="text-sm text-gray-600">Sync pricing changes across platforms</p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Inventory sync</Label>
            <p className="text-sm text-gray-600">Auto-update inventory levels</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    );
  }

  // For other platforms
  return (
    <div className="mt-4 pl-11 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${platform.name}-api`}>API Key</Label>
          <Input
            id={`${platform.name}-api`}
            type="password"
            placeholder="••••••••••••••••"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`${platform.name}-store`}>Store ID</Label>
          <Input
            id={`${platform.name}-store`}
            placeholder="Your store identifier"
            className="mt-1"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-listing</Label>
            <p className="text-sm text-gray-600">Automatically list new items</p>
          </div>
          <Switch
            checked={platform.autoList}
            onCheckedChange={(checked) => updatePlatformSetting('autoList', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Price sync</Label>
            <p className="text-sm text-gray-600">Sync pricing changes across platforms</p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Inventory sync</Label>
            <p className="text-sm text-gray-600">Auto-update inventory levels</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  );
};