import React, { useState, useEffect, useCallback } from 'react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { ListingService } from '@/services/ListingService';
import { PlatformService } from '@/services/PlatformService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, DollarSign, Clock, ArrowUpRight, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlatformManager from './PlatformManager';
import OfferManager from './OfferManager';
import CrossListingRules from './CrossListingRules';
import EnterpriseSalesOperationsComplete from './EnterpriseSalesOperationsComplete';

interface SalesOperationsManagerProps {
  onNavigateToInventory: () => void;
}

export default function SalesOperationsManager({ onNavigateToInventory }: SalesOperationsManagerProps) {
  const { listings, isLoading, error, fetchListings } = useInventoryStore();
  const { toast } = useToast();

  // Mock data for components that need props
  const [platforms] = useState([
    { 
      id: 'ebay', 
      name: 'eBay', 
      icon: '🛒',
      isActive: true,
      settings: {
        autoList: true,
        autoDelist: false,
        autoPrice: true,
        offerManagement: true
      },
      fees: {
        listingFee: 0.35,
        finalValueFee: 13.25,
        paymentProcessingFee: 2.9
      }
    },
    { 
      id: 'amazon', 
      name: 'Amazon', 
      icon: '📦',
      isActive: false,
      settings: {
        autoList: false,
        autoDelist: false,
        autoPrice: false,
        offerManagement: false
      },
      fees: {
        listingFee: 0.99,
        finalValueFee: 15.0,
        paymentProcessingFee: 2.9
      }
    },
    { 
      id: 'facebook', 
      name: 'Facebook Marketplace', 
      icon: '📘',
      isActive: false,
      settings: {
        autoList: false,
        autoDelist: false,
        autoPrice: false,
        offerManagement: false
      },
      fees: {
        listingFee: 0.0,
        finalValueFee: 5.0,
        paymentProcessingFee: 2.9
      }
    }
  ]);

  const [offers] = useState([]);
  const [rules] = useState([]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handlePlatformToggle = useCallback((platformId: string) => {
    toast({
      title: "Platform Toggle",
      description: `Platform ${platformId} toggled`,
    });
  }, [toast]);

  const handlePlatformSettings = useCallback((platformId: string) => {
    toast({
      title: "Platform Settings",
      description: `Opening settings for ${platformId}`,
    });
  }, [toast]);

  const handleAddPlatform = useCallback(() => {
    toast({
      title: "Add Platform",
      description: "Add new platform functionality",
    });
  }, [toast]);

  const handleCreateOffer = useCallback(() => {
    toast({
      title: "Create Offer",
      description: "Create new offer functionality",
    });
  }, [toast]);

  const handleSendOffer = useCallback((offerId: string) => {
    toast({
      title: "Send Offer",
      description: `Sending offer ${offerId}`,
    });
  }, [toast]);

  const handleCancelOffer = useCallback((offerId: string) => {
    toast({
      title: "Cancel Offer",
      description: `Cancelling offer ${offerId}`,
    });
  }, [toast]);

  const handleCreateRule = useCallback(() => {
    toast({
      title: "Create Rule",
      description: "Create new rule functionality",
    });
  }, [toast]);

  const handleEditRule = useCallback((ruleId: string) => {
    toast({
      title: "Edit Rule",
      description: `Editing rule ${ruleId}`,
    });
  }, [toast]);

  const handleDeleteRule = useCallback((ruleId: string) => {
    toast({
      title: "Delete Rule",
      description: `Deleting rule ${ruleId}`,
    });
  }, [toast]);

  const handleToggleRule = useCallback((ruleId: string) => {
    toast({
      title: "Toggle Rule",
      description: `Toggling rule ${ruleId}`,
    });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading sales operations...</p>
            </div>
          </CardContent>
        </Card>
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
              <Button onClick={fetchListings} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">No inventory found. Create some listings first.</p>
              <Button onClick={onNavigateToInventory}>
                Go to Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Tabs defaultValue="automation" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="automation" className="text-xs md:text-sm px-2 md:px-4">Enterprise</TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs md:text-sm px-2 md:px-4">Platforms</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs md:text-sm px-2 md:px-4">Rules</TabsTrigger>
          <TabsTrigger value="offers" className="text-xs md:text-sm px-2 md:px-4">Offers</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs md:text-sm px-2 md:px-4">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="automation">
          <EnterpriseSalesOperationsComplete onNavigateToInventory={onNavigateToInventory} />
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <PlatformManager 
            platforms={platforms}
            platformListings={[]}
            onPlatformToggle={handlePlatformToggle}
            onPlatformSettings={handlePlatformSettings}
            onAddPlatform={handleAddPlatform}
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <CrossListingRules 
            rules={rules}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
          />
        </TabsContent>

        <TabsContent value="offers" className="space-y-6">
          <OfferManager 
            offers={offers}
            onCreateOffer={handleCreateOffer}
            onSendOffer={handleSendOffer}
            onCancelOffer={handleCancelOffer}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Listings</p>
                  <p className="text-2xl font-bold">{listings.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Active Listings</p>
                  <p className="text-2xl font-bold">{listings.filter(l => l.status === 'active').length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Sold Items</p>
                  <p className="text-2xl font-bold">{listings.filter(l => l.status === 'sold').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
