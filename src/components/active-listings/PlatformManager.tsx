
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Zap, Eye, Heart, TrendingUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Platform, PlatformListing } from '@/types/Platform';

interface PlatformManagerProps {
  platforms: Platform[];
  platformListings: PlatformListing[];
  onPlatformToggle: (platformId: string, enabled: boolean) => void;
  onPlatformSettings: (platformId: string) => void;
  onAddPlatform: () => void;
}

const PlatformManager = ({
  platforms,
  platformListings,
  onPlatformToggle,
  onPlatformSettings,
  onAddPlatform
}: PlatformManagerProps) => {
  const isMobile = useIsMobile();

  const getPlatformStats = (platformId: string) => {
    const platformSpecificListings = platformListings.filter(pl => pl.platform === platformId);
    return {
      total: platformSpecificListings.length,
      active: platformSpecificListings.filter(pl => pl.status === 'active').length,
      totalViews: platformSpecificListings.reduce((sum, pl) => sum + pl.views, 0),
      totalWatchers: platformSpecificListings.reduce((sum, pl) => sum + pl.watchers, 0),
      totalOffers: platformSpecificListings.reduce((sum, pl) => sum + pl.offers, 0)
    };
  };

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row'} justify-between items-center`}>
        <h2 className="text-2xl font-bold">Platform Management</h2>
        <Button onClick={onAddPlatform} className="flex items-center gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Add Platform
        </Button>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
        {platforms.map((platform) => {
          const stats = getPlatformStats(platform.id);
          return (
            <Card key={platform.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold">{platform.icon}</span>
                    </div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                  <Switch
                    checked={platform.isActive}
                    onCheckedChange={(checked) => onPlatformToggle(platform.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-4 text-sm`}>
                  <div>
                    <div className="text-gray-500 text-xs">Active Listings</div>
                    <div className="font-semibold">{stats.active}/{stats.total}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 flex items-center gap-1 text-xs">
                      <Eye className="w-3 h-3" />
                      Views
                    </div>
                    <div className="font-semibold">{stats.totalViews}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 flex items-center gap-1 text-xs">
                      <Heart className="w-3 h-3" />
                      Watchers
                    </div>
                    <div className="font-semibold">{stats.totalWatchers}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Offers
                    </div>
                    <div className="font-semibold">{stats.totalOffers}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {platform.settings.autoList && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Auto-List
                    </Badge>
                  )}
                  {platform.settings.autoDelist && (
                    <Badge variant="secondary" className="text-xs">Auto-Delist</Badge>
                  )}
                  {platform.settings.autoPrice && (
                    <Badge variant="secondary" className="text-xs">Auto-Price</Badge>
                  )}
                  {platform.settings.offerManagement && (
                    <Badge variant="secondary" className="text-xs">Offers</Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPlatformSettings(platform.id)}
                  className="w-full flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Platform Settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {platforms.length === 0 && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Platforms Connected</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Connect your selling platforms to start cross-listing and managing your inventory.
          </p>
          <Button onClick={onAddPlatform} className="w-full md:w-auto">
            Add Your First Platform
          </Button>
        </Card>
      )}
    </div>
  );
};

export default PlatformManager;
