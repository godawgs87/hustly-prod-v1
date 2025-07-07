
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap, Percent, BarChart3 } from 'lucide-react';
import PlatformManager from './PlatformManager';
import CrossListingRules from './CrossListingRules';
import OfferManager from './OfferManager';
import type { Platform, CrossListingRule, ListingOffer, PlatformListing } from '@/types/Platform';

interface ActiveListingsManagerProps {
  platforms: Platform[];
  rules: CrossListingRule[];
  offers: ListingOffer[];
  platformListings: PlatformListing[];
}

const ActiveListingsManager = ({
  platforms,
  rules,
  offers,
  platformListings
}: ActiveListingsManagerProps) => {
  const [activeTab, setActiveTab] = useState('platforms');

  // Mock handlers - these would connect to your backend
  const handlePlatformToggle = (platformId: string, enabled: boolean) => {
    console.log('Toggle platform:', platformId, enabled);
  };

  const handlePlatformSettings = (platformId: string) => {
    console.log('Open platform settings:', platformId);
  };

  const handleAddPlatform = () => {
    console.log('Add new platform');
  };

  const handleCreateRule = () => {
    console.log('Create new cross-listing rule');
  };

  const handleEditRule = (ruleId: string) => {
    console.log('Edit rule:', ruleId);
  };

  const handleDeleteRule = (ruleId: string) => {
    console.log('Delete rule:', ruleId);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    console.log('Toggle rule:', ruleId, enabled);
  };

  const handleCreateOffer = (offer: any) => {
    console.log('Create offer:', offer);
  };

  const handleSendOffer = (offerId: string) => {
    console.log('Send offer:', offerId);
  };

  const handleCancelOffer = (offerId: string) => {
    console.log('Cancel offer:', offerId);
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'platforms': return platforms.filter(p => p.isActive).length;
      case 'rules': return rules.filter(r => r.settings.autoList).length;
      case 'offers': return offers.filter(o => o.isActive).length;
      default: return 0;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Active Listings Management</h1>
        <p className="text-gray-600">
          Manage cross-platform listings, automation rules, and promotional offers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platforms" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Platforms
            <Badge variant="secondary" className="ml-1">
              {getTabCount('platforms')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Auto Rules
            <Badge variant="secondary" className="ml-1">
              {getTabCount('rules')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Offers
            <Badge variant="secondary" className="ml-1">
              {getTabCount('offers')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <PlatformManager
            platforms={platforms}
            platformListings={platformListings}
            onPlatformToggle={handlePlatformToggle}
            onPlatformSettings={handlePlatformSettings}
            onAddPlatform={handleAddPlatform}
          />
        </TabsContent>

        <TabsContent value="rules">
          <CrossListingRules
            rules={rules}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
          />
        </TabsContent>

        <TabsContent value="offers">
          <OfferManager
            offers={offers}
            onCreateOffer={handleCreateOffer}
            onSendOffer={handleSendOffer}
            onCancelOffer={handleCancelOffer}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
            <p className="text-gray-600">
              Track performance across platforms, monitor listing success rates, and optimize your strategy.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActiveListingsManager;
