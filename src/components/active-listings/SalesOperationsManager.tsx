
import React, { useState } from 'react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { ListingService } from '@/services/ListingService';
import { PlatformService } from '@/services/PlatformService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, DollarSign, Clock, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlatformManager from './PlatformManager';
import OfferManager from './OfferManager';
import CrossListingRules from './CrossListingRules';

interface SalesOperationsManagerProps {
  onNavigateToInventory: () => void;
}

const SalesOperationsManager = ({ onNavigateToInventory }: SalesOperationsManagerProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [platforms, setPlatforms] = useState([]);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [platformListings, setPlatformListings] = useState([]);
  const [platformLoading, setPlatformLoading] = useState(true);
  const { toast } = useToast();
  
  const { listings, isLoading: loading, error, stats, refetch } = useInventoryStore();

  // Load platform data on mount
  React.useEffect(() => {
    const loadPlatformData = async () => {
      try {
        setPlatformLoading(true);
        const [platformsRes, rulesRes, offersRes, listingsRes] = await Promise.all([
          PlatformService.getPlatforms(),
          PlatformService.getCrossListingRules(),
          PlatformService.getListingOffers(),
          PlatformService.getPlatformListings()
        ]);
        
        setPlatforms(platformsRes);
        setRules(rulesRes);
        setOffers(offersRes);
        setPlatformListings(listingsRes);
      } catch (error: any) {
        console.error('Failed to load platform data:', error);
        toast({
          title: "Error",
          description: "Failed to load platform data",
          variant: "destructive"
        });
      } finally {
        setPlatformLoading(false);
      }
    };

    loadPlatformData();
  }, [toast]);

  // Mock handlers for platform operations
  const handlePlatformToggle = (platformId: string, enabled: boolean) => {
    console.log('Toggle platform:', platformId, enabled);
  };

  const handlePlatformSettings = (platformId: string) => {
    console.log('Platform settings:', platformId);
  };

  const handleAddPlatform = () => {
    console.log('Add platform');
  };

  const handleCreateRule = () => {
    console.log('Create rule');
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

  if (loading || platformLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Error loading sales data: {error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Load inventory on mount
  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const activeListings = listings.filter(l => l.status === 'active');
  const totalValue = activeListings.reduce((sum, listing) => sum + (listing.price || 0), 0);
  const avgPrice = activeListings.length > 0 ? totalValue / activeListings.length : 0;
  const avgDaysListed = activeListings.length > 0 
    ? activeListings.reduce((sum, listing) => {
        const listedDate = listing.listed_date ? new Date(listing.listed_date) : new Date(listing.created_at);
        const daysSinceListed = Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + daysSinceListed;
      }, 0) / activeListings.length
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold">{activeListings.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold">${avgPrice.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Days Listed</p>
                <p className="text-2xl font-bold">{Math.round(avgDaysListed)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Listings Overview
                <Button onClick={onNavigateToInventory} variant="outline" size="sm">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Manage Inventory
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeListings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No active listings found</p>
                  <Button onClick={onNavigateToInventory}>
                    Create Your First Listing
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.slice(0, 6).map((listing) => (
                    <Card key={listing.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm line-clamp-2">{listing.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-green-600">
                              ${listing.price?.toFixed(2)}
                            </span>
                            <Badge variant="secondary">{listing.category}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Listed: {listing.listed_date 
                              ? new Date(listing.listed_date).toLocaleDateString()
                              : new Date(listing.created_at).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms">
          <PlatformManager
            platforms={platforms}
            platformListings={platformListings}
            onPlatformToggle={handlePlatformToggle}
            onPlatformSettings={handlePlatformSettings}
            onAddPlatform={handleAddPlatform}
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

        <TabsContent value="rules">
          <CrossListingRules
            rules={rules}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesOperationsManager;
