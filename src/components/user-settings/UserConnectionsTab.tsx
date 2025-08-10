import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import EbayOAuthConnection from './connections/EbayOAuthConnection';
import PlatformPolicyStatusCard from '@/components/platforms/PlatformPolicyStatusCard';
import PlatformCategorySync from '@/components/platforms/PlatformCategorySync';
import { GenericPlatformCard } from './connections/GenericPlatformCard';
import { PlatformSettingsSection } from './connections/PlatformSettingsSection';
interface Platform {
  name: string;
  connected: boolean;
  autoList: boolean;
  icon: string;
}
const UserConnectionsTab = () => {
  const [ebayAccountType, setEbayAccountType] = useState<string>('individual');

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

  React.useEffect(() => {
    loadEbayAccountType();
  }, []);

  const loadEbayAccountType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user profile first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ebay_account_type')
        .eq('id', user.id)
        .single();

      if (profile?.ebay_account_type) {
        setEbayAccountType(profile.ebay_account_type);
      }

      // Also check marketplace account
      const { data: marketplaceAccount } = await supabase
        .from('marketplace_accounts')
        .select('ebay_account_type')
        .eq('user_id', user.id)
        .eq('platform', 'ebay')
        .single();

      if (marketplaceAccount?.ebay_account_type) {
        setEbayAccountType(marketplaceAccount.ebay_account_type);
      }
    } catch (error) {
      console.error('Error loading eBay account type:', error);
    }
  };
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
          
          {ebayAccountType === 'individual' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Individual eBay Account</h4>
              <p className="text-sm text-blue-800">
                Your eBay account uses built-in policies. No custom business policies needed - eBay handles payment, returns, and shipping policies automatically.
              </p>
            </div>
          )}
          
          {ebayAccountType === 'business' && (
            <>
              <PlatformPolicyStatusCard platformId="ebay" />
              <Separator className="mt-6" />
            </>
          )}
          
          <PlatformCategorySync platformId="ebay" />
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