import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from 'lucide-react';

import EbayOAuthConnection from './connections/EbayOAuthConnection';
import EbayPolicyStatusCard from './connections/EbayPolicyStatusCard';
import EbayCategorySync from './connections/EbayCategorySync';
import { GenericPlatformCard } from './connections/GenericPlatformCard';
import { PlatformSettingsSection } from './connections/PlatformSettingsSection';
interface Platform {
  name: string;
  connected: boolean;
  autoList: boolean;
  icon: string;
}
const UserConnectionsTab = () => {
  

  const [platforms, setPlatforms] = useState<Platform[]>([{
    name: 'Mercari',
    connected: false,
    autoList: false,
    icon: '📦'
  }, {
    name: 'Poshmark',
    connected: false,
    autoList: false,
    icon: '👗'
  }, {
    name: 'Whatnot',
    connected: false,
    autoList: false,
    icon: '📱'
  }, {
    name: 'Depop',
    connected: false,
    autoList: false,
    icon: '🎨'
  }]);
  const handleImportListings = async () => {
    // await importSoldListings(10); // Temporarily disabled - using newer sync operation
    console.log('Import listings functionality temporarily disabled');
  };
  const handleGenericDisconnect = (platformName: string) => {
    setPlatforms(prev => prev.map(p => p.name === platformName ? {
      ...p,
      connected: false
    } : p));
  };
  return <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Link className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Platform Connections</h3>
      </div>

      <div className="space-y-6">
        {/* eBay Section */}
        <div>
          <EbayOAuthConnection />
          <Separator className="mt-6" />
          <EbayPolicyStatusCard />
          <Separator className="mt-6" />
          <EbayCategorySync />
          <Separator className="mt-6" />
        </div>

        {/* Other Platforms */}
        {platforms.map((platform, index) => <div key={platform.name}>
            <GenericPlatformCard platform={platform} onConnect={() => {}} onDisconnect={() => handleGenericDisconnect(platform.name)} />

            {platform.connected && <PlatformSettingsSection platform={platform} index={index + 1} platforms={platforms} setPlatforms={setPlatforms} />}

            {index < platforms.length - 1 && <Separator className="mt-6" />}
          </div>)}

      </div>
    </Card>;
};
export default UserConnectionsTab;