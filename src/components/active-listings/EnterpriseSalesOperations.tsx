import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  AlertCircle,
  Play,
  Pause,
  Settings,
  BarChart3,
  Target,
  Zap,
  Eye,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SalesOperationsEngine, SalesRule } from '@/services/SimplifiedSalesOperationsEngine';

interface EnterpriseSalesOperationsProps {
  onNavigateToInventory: () => void;
}

const EnterpriseSalesOperations: React.FC<EnterpriseSalesOperationsProps> = ({
  onNavigateToInventory
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [salesRules, setSalesRules] = useState<SalesRule[]>([]);
  const [performanceData, setPerformanceData] = useState<ListingPerformance[]>([]);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salesEngine] = useState(() => SalesOperationsEngine.getInstance());
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    try {
      setIsLoading(true);
      const rules = await salesEngine.loadRules();
      setSalesRules(rules);
      
      // Load performance data and market intelligence
      // These would be implemented based on your data structure
      
    } catch (error) {
      console.error('Failed to load sales data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales operations data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    try {
      if (automationEnabled) {
        await salesEngine.stopAutomation();
        toast({
          title: "Automation Stopped",
          description: "Sales automation has been paused",
        });
      } else {
        await salesEngine.startAutomation();
        toast({
          title: "Automation Started",
          description: "Sales automation is now running",
        });
      }
      setAutomationEnabled(!automationEnabled);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle automation",
        variant: "destructive"
      });
    }
  };

  const createDefaultRules = async () => {
    const defaultRules = [
      {
        name: "Auto-Delist Stale Listings",
        type: "auto_delist" as const,
        conditions: [
          { field: "days_listed", operator: "gt" as const, value: 30 },
          { field: "views", operator: "lt" as const, value: 10, logic: "AND" as const }
        ],
        actions: [
          { type: "delist" as const, parameters: { reason: "low_engagement" } }
        ],
        enabled: true,
        priority: 1
      },
      {
        name: "Price Drop for Low Engagement",
        type: "price_adjust" as const,
        conditions: [
          { field: "days_listed", operator: "gt" as const, value: 14 },
          { field: "engagement_score", operator: "lt" as const, value: 20, logic: "AND" as const }
        ],
        actions: [
          { type: "price_drop" as const, parameters: { adjustment_type: "percentage", amount: 10 } }
        ],
        enabled: true,
        priority: 2
      },
      {
        name: "Auto-Offer to Watchers",
        type: "offer_response" as const,
        conditions: [
          { field: "watchers", operator: "gt" as const, value: 3 },
          { field: "days_listed", operator: "gt" as const, value: 7, logic: "AND" as const }
        ],
        actions: [
          { type: "send_offer" as const, parameters: { discount_percentage: 15, message: "Special offer for interested buyers!" } }
        ],
        enabled: true,
        priority: 3
      }
    ];

    try {
      for (const rule of defaultRules) {
        await salesEngine.createRule(rule);
      }
      await loadSalesData();
      toast({
        title: "Default Rules Created",
        description: "Enterprise sales automation rules have been set up",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create default rules",
        variant: "destructive"
      });
    }
  };

  // Mock data for demonstration
  const salesMetrics = {
    totalRevenue: 12450,
    revenueChange: 18.5,
    activeListings: 156,
    listingsChange: -3.2,
    avgSaleTime: 12.5,
    timeChange: -8.1,
    conversionRate: 24.8,
    conversionChange: 12.3
  };

  const automationStats = {
    rulesExecuted: 47,
    actionsPerformed: 23,
    listingsOptimized: 34,
    revenueImpact: 1250
  };

  if (isLoading) {
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

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Sales Operations</h1>
          <p className="text-muted-foreground">Automated listing management and optimization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={automationEnabled}
              onCheckedChange={handleToggleAutomation}
              id="automation-toggle"
            />
            <label htmlFor="automation-toggle" className="text-sm font-medium">
              {automationEnabled ? 'Automation ON' : 'Automation OFF'}
            </label>
            {automationEnabled ? (
              <Play className="w-4 h-4 text-green-600" />
            ) : (
              <Pause className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <Button onClick={loadSalesData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${salesMetrics.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">+{salesMetrics.revenueChange}%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-2xl font-bold">{salesMetrics.activeListings}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-600">{salesMetrics.listingsChange}%</span>
                </div>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Sale Time</p>
                <p className="text-2xl font-bold">{salesMetrics.avgSaleTime} days</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">{salesMetrics.timeChange}%</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{salesMetrics.conversionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">+{salesMetrics.conversionChange}%</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intel</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Automation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Automation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant={automationEnabled ? "default" : "secondary"}>
                    {automationEnabled ? "Running" : "Paused"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rules Executed Today</span>
                  <span className="font-medium">{automationStats.rulesExecuted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Actions Performed</span>
                  <span className="font-medium">{automationStats.actionsPerformed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Listings Optimized</span>
                  <span className="font-medium">{automationStats.listingsOptimized}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Revenue Impact</span>
                  <span className="font-medium text-green-600">+${automationStats.revenueImpact}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={createDefaultRules} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Default Rules
                </Button>
                <Button 
                  onClick={onNavigateToInventory} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Package className="w-4 h-4 mr-2" />
                  View All Listings
                </Button>
                <Button 
                  onClick={() => setActiveTab('performance')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance Analytics
                </Button>
                <Button 
                  onClick={() => setActiveTab('intelligence')} 
                  className="w-full justify-start"
                  variant="outline"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Market Intelligence
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="automation" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Automation Rules</h2>
            <Button onClick={createDefaultRules}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {salesRules.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Create automation rules to optimize your listings automatically
                </p>
                <Button onClick={createDefaultRules}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Default Rules
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {salesRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {rule.type.replace('_', ' ').toUpperCase()} • Priority {rule.priority}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Executed {rule.execution_count} times</p>
                      {rule.last_executed && (
                        <p>Last run: {new Date(rule.last_executed).toLocaleString()}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed performance analytics will be displayed here, including listing performance, 
                conversion rates, and optimization recommendations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Market intelligence data, pricing trends, and competitive analysis will be shown here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnterpriseSalesOperations;
