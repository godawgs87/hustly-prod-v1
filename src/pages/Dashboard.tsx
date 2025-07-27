import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  PlusCircle,
  Upload,
  RefreshCw,
  Eye,
  MessageSquare,
  Truck,
  Zap,
  Target,
  Activity,
  Users,
  ShoppingCart,
  Settings,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface BusinessMetrics {
  revenue: { current: number; change: number; period: string };
  profit: { current: number; margin: number; change: number };
  activeListings: { count: number; platforms: number };
  inventory: { total: number; readyToList: number };
}

interface PlatformStatus {
  platform: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync: string;
  activeListings: number;
  pendingActions: number;
}

interface ActionItem {
  id: string;
  type: 'offer' | 'shipping' | 'sync' | 'pricing';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  platform?: string;
  actionUrl: string;
}

interface AIInsight {
  id: string;
  type: 'pricing' | 'timing' | 'trending' | 'opportunity';
  title: string;
  description: string;
  impact: string;
  actionUrl: string;
}

const Dashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Live business metrics from inventory and listings data
  const { data: listings = [] } = useQuery({
    queryKey: ['user-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['user-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const businessMetrics: BusinessMetrics = useMemo(() => {
    const activeListings = listings.filter(l => l.status === 'active');
    const soldListings = inventory.filter(l => l.status === 'sold' && l.sold_date);
    const totalRevenue = soldListings.reduce((sum, item) => sum + (item.sold_price || 0), 0);
    const totalCosts = soldListings.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
    
    return {
      revenue: { current: totalRevenue, change: 0, period: 'total' },
      profit: { current: profit, margin: profitMargin, change: 0 },
      activeListings: { count: activeListings.length, platforms: 1 }, // TODO: Count actual platforms
      inventory: { total: inventory.length, readyToList: inventory.filter(l => l.status === 'draft').length }
    };
  }, [listings, inventory]);

  // Live platform status from actual connections
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Check eBay connection status
  const { data: marketplaceAccounts } = useQuery({
    queryKey: ['marketplace-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const platformStatus: PlatformStatus[] = useMemo(() => {
    const ebayListings = listings.filter(l => l.status === 'active').length;
    const ebayAccount = marketplaceAccounts?.find(acc => acc.platform === 'ebay' && acc.is_connected);
    const isEbayConnected = !!ebayAccount;
    
    return [
      {
        platform: 'eBay',
        status: isEbayConnected ? 'connected' : 'disconnected',
        lastSync: isEbayConnected ? 'Connected' : 'Not connected',
        activeListings: ebayListings,
        pendingActions: 0
      },
      {
        platform: 'Mercari',
        status: 'disconnected',
        lastSync: 'Not connected',
        activeListings: 0,
        pendingActions: 0
      },
      {
        platform: 'Poshmark',
        status: 'disconnected',
        lastSync: 'Not connected',
        activeListings: 0,
        pendingActions: 0
      }
    ];
  }, [userProfile, listings]);

  // Action items based on actual data - currently empty, can be expanded with real notifications
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    
    // Add action items based on actual data
    const draftListings = inventory.filter(l => l.status === 'draft');
    if (draftListings.length > 0) {
      items.push({
        id: 'draft-listings',
        type: 'sync',
        title: `${draftListings.length} draft listings ready to publish`,
        description: 'Complete and publish your draft listings',
        priority: 'medium',
        actionUrl: '/inventory'
      });
    }
    
    return items;
  }, [inventory]);

  // AI insights - currently empty, can be expanded with real AI-generated insights
  const aiInsights: AIInsight[] = useMemo(() => {
    // TODO: Implement real AI insights based on user data and market trends
    return [];
  }, []);

  const getStatusIcon = (status: PlatformStatus['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'disconnected': return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'offer': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'shipping': return <Truck className="w-4 h-4 text-orange-500" />;
      case 'sync': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pricing': return <TrendingUp className="w-4 h-4 text-purple-500" />;
    }
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'pricing': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'timing': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'trending': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'opportunity': return <Target className="w-4 h-4 text-green-500" />;
    }
  };

  const totalPendingActions = actionItems.filter(item => item.priority === 'high').length;

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader 
        title="Dashboard" 
        userEmail={user?.email}
      />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold mb-4">🚀 Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/create-listing')}>
              <CardContent className="p-6 text-center">
                <PlusCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Create New Listing</h3>
                <p className="text-sm text-gray-600">Add a new item to sell</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/inventory')}>
              <CardContent className="p-6 text-center">
                <Package className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Manage Inventory</h3>
                <p className="text-sm text-gray-600">{businessMetrics.inventory.total} items total</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/active-listings')}>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Sales Operations</h3>
                <p className="text-sm text-gray-600">{businessMetrics.activeListings.count} active listings</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/pricing')}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Pricing Intelligence</h3>
                <p className="text-sm text-gray-600">AI-powered pricing</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Business Health */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📊 Business Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">${businessMetrics.revenue.current.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">
                        +{businessMetrics.revenue.change}% {businessMetrics.revenue.period}
                      </span>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="text-2xl font-bold">${businessMetrics.profit.current.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-600">{businessMetrics.profit.margin}% margin</span>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">+{businessMetrics.profit.change}%</span>
                    </div>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                    <p className="text-2xl font-bold">{businessMetrics.activeListings.count}</p>
                    <p className="text-xs text-gray-600">
                      Across {businessMetrics.activeListings.platforms} platforms
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory</p>
                    <p className="text-2xl font-bold">{businessMetrics.inventory.total}</p>
                    <p className="text-xs text-gray-600">
                      {businessMetrics.inventory.readyToList} ready to list
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Action Required */}
        {actionItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">🚨 Action Required</h2>
              <Badge variant="destructive">{totalPendingActions} urgent</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actionItems.map((item) => (
                <Card 
                  key={item.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    item.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                  }`}
                  onClick={() => navigate(item.actionUrl)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getActionIcon(item.type)}
                        <div className="flex-1">
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {item.platform && (
                              <Badge variant="outline" className="text-xs">
                                {item.platform}
                              </Badge>
                            )}
                            <Badge 
                              className={`text-xs ${
                                item.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {item.priority} priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio Overview */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📦 Portfolio Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Status</CardTitle>
                <CardDescription>Connection and sync status across marketplaces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {platformStatus.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(platform.status)}
                      <div>
                        <p className="font-medium">{platform.platform}</p>
                        <p className="text-sm text-gray-600">Last sync: {platform.lastSync}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{platform.activeListings} active</p>
                      {platform.pendingActions > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {platform.pendingActions} action{platform.pendingActions > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Tools</CardTitle>
                <CardDescription>Access operational tools and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between" 
                  onClick={() => navigate('/shipping')}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping Management
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-between" 
                  onClick={() => navigate('/settings')}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Automation & Settings
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-between" 
                  onClick={() => navigate('/alerts')}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    View All Alerts
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AI Insights */}
        <section>
          <h2 className="text-xl font-semibold mb-4">🤖 AI Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {aiInsights.map((insight) => (
              <Card 
                key={insight.id} 
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => navigate(insight.actionUrl)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {insight.impact}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="dashboard"
          onNavigate={() => {}}
          title="Dashboard"
        />
      )}
    </div>
  );
};

export default Dashboard;
