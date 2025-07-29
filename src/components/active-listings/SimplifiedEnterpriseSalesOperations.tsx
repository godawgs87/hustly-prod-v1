import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Target,
  ArrowUpRight,
  Clock,
  DollarSign,
  Package,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SalesOperationsEngine } from '@/services/SimplifiedSalesOperationsEngine';

interface EnterpriseSalesOperationsProps {
  onNavigateToInventory: () => void;
}

export default function SimplifiedEnterpriseSalesOperations({ onNavigateToInventory }: EnterpriseSalesOperationsProps) {
  const [automationRunning, setAutomationRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    totalListings: 0,
    activeListings: 0,
    soldListings: 0,
    conversionRate: 0,
    totalAutomationRules: 0,
    activeRules: 0,
    automationRunning: false
  });
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    condition: 'days_listed',
    conditionValue: '',
    action: 'delist',
    actionValue: '',
    enabled: true
  });
  const { toast } = useToast();

  const salesEngine = SalesOperationsEngine.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loadedRules, loadedMetrics] = await Promise.all([
        salesEngine.loadRules(),
        salesEngine.getPerformanceMetrics()
      ]);
      
      setRules(loadedRules);
      setMetrics(loadedMetrics);
      setAutomationRunning(salesEngine.isAutomationRunning());
    } catch (error) {
      console.error('Failed to load sales operations data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales operations data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    try {
      if (automationRunning) {
        await salesEngine.stopAutomation();
        setAutomationRunning(false);
        toast({
          title: "Automation Stopped",
          description: "Enterprise sales automation has been stopped",
        });
      } else {
        await salesEngine.startAutomation();
        setAutomationRunning(true);
        toast({
          title: "Automation Started",
          description: "Enterprise sales automation is now running",
        });
      }
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle automation",
        variant: "destructive"
      });
    }
  };

  const handleCreateDefaultRules = async () => {
    try {
      // Create some default automation rules
      const defaultRules = [
        {
          name: 'Auto-delist stale listings',
          condition: 'days_listed',
          conditionValue: '30',
          action: 'delist',
          actionValue: '',
          enabled: true
        },
        {
          name: 'Reduce price after 14 days',
          condition: 'days_listed',
          conditionValue: '14',
          action: 'adjust_price',
          actionValue: '-10',
          enabled: true
        },
        {
          name: 'Promote high-view items',
          condition: 'views',
          conditionValue: '50',
          action: 'promote',
          actionValue: '',
          enabled: true
        }
      ];

      for (const rule of defaultRules) {
        await salesEngine.createRule(rule);
      }

      await loadData();
      toast({
        title: "Default Rules Created",
        description: `Created ${defaultRules.length} default automation rules`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create default rules",
        variant: "destructive"
      });
    }
  };

  const handleCreateRule = async () => {
    try {
      if (editingRule) {
        await salesEngine.updateRule(editingRule.id, ruleForm);
        toast({
          title: "Rule Updated",
          description: "Automation rule has been updated",
        });
      } else {
        await salesEngine.createRule(ruleForm);
        toast({
          title: "Rule Created",
          description: "New automation rule has been created",
        });
      }
      
      setShowRuleDialog(false);
      setEditingRule(null);
      setRuleForm({
        name: '',
        condition: 'days_listed',
        conditionValue: '',
        action: 'delist',
        actionValue: '',
        enabled: true
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save rule",
        variant: "destructive"
      });
    }
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      condition: rule.condition,
      conditionValue: rule.conditionValue,
      action: rule.action,
      actionValue: rule.actionValue,
      enabled: rule.enabled
    });
    setShowRuleDialog(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await salesEngine.deleteRule(ruleId);
      await loadData();
      toast({
        title: "Rule Deleted",
        description: "Automation rule has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await salesEngine.updateRule(ruleId, { enabled });
      await loadData();
      toast({
        title: enabled ? "Rule Enabled" : "Rule Disabled",
        description: `Automation rule has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle rule",
        variant: "destructive"
      });
    }
  };

  const openCreateRuleDialog = () => {
    setEditingRule(null);
    setRuleForm({
      name: '',
      condition: 'days_listed',
      conditionValue: '',
      action: 'delist',
      actionValue: '',
      enabled: true
    });
    setShowRuleDialog(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading sales operations...</div>
      </div>
    );
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'days_listed': return 'Days Listed';
      case 'views': return 'Views';
      case 'watchers': return 'Watchers';
      case 'price': return 'Price';
      default: return condition;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'delist': return 'Delist';
      case 'adjust_price': return 'Adjust Price';
      case 'promote': return 'Promote';
      case 'relist': return 'Relist';
      case 'cross_list': return 'Cross-list';
      default: return action;
    }
  };
          name: 'Auto-Promote High Performers',
          type: 'promote' as const,
          conditions: [
            { field: 'views', operator: 'gt' as const, value: 100 },
            { field: 'watchers', operator: 'gt' as const, value: 5, logic: 'AND' as const }
          ],
          actions: [{ type: 'promote' as const, parameters: { boost_level: 'high' } }],
          enabled: true,
          priority: 1
        },
        {
          name: 'Cross-List Popular Items',
          type: 'cross_list' as const,
          conditions: [
            { field: 'views', operator: 'gt' as const, value: 50 },
            { field: 'days_listed', operator: 'lt' as const, value: 7, logic: 'AND' as const }
          ],
          actions: [{ type: 'cross_list' as const, parameters: { platforms: ['facebook', 'amazon'] } }],
          enabled: true,
          priority: 2
        }
      ];

      for (const rule of defaultRules) {
        await salesEngine.createRule(rule);
      }

      await loadData();
      toast({
        title: "Default Rules Created",
        description: `Created ${defaultRules.length} default automation rules`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create default rules",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading enterprise automation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Automation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              Enterprise Sales Automation
            </div>
            <Badge variant={automationRunning ? "default" : "secondary"}>
              {automationRunning ? "Running" : "Stopped"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Automation Engine</h3>
              <p className="text-gray-600">
                {automationRunning 
                  ? "Automatically managing your listings with intelligent rules" 
                  : "Start automation to enable intelligent listing management"
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Switch
                checked={automationRunning}
                onCheckedChange={handleToggleAutomation}
              />
              <Button
                onClick={handleToggleAutomation}
                variant={automationRunning ? "destructive" : "default"}
                size="sm"
              >
                {automationRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Active Listings</p>
              <p className="text-xl font-bold">{metrics.activeListings}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600">Active Rules</p>
              <p className="text-xl font-bold">{metrics.activeRules}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <p className="text-sm text-gray-600">Total Rules</p>
              <p className="text-xl font-bold">{metrics.totalAutomationRules}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Tabs */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Automation Rules
                <div className="flex space-x-2">
                  <Button onClick={handleCreateDefaultRules} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Default Rules
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Rules
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">No automation rules configured</p>
                  <Button onClick={handleCreateDefaultRules}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Rules
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{rule.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {rule.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Priority: {rule.priority} | Executed: {rule.execution_count} times
                      </p>
                      <div className="text-xs text-gray-500">
                        {rule.conditions.length} conditions, {rule.actions.length} actions
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Listing Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Listings</span>
                      <span className="font-medium">{metrics.totalListings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Listings</span>
                      <span className="font-medium">{metrics.activeListings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sold Items</span>
                      <span className="font-medium">{metrics.soldListings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="font-medium">{metrics.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Automation Impact</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rules Created</span>
                      <span className="font-medium">{metrics.totalAutomationRules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Rules</span>
                      <span className="font-medium">{metrics.activeRules}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Engine Status</span>
                      <Badge variant={automationRunning ? "default" : "secondary"}>
                        {automationRunning ? "Running" : "Stopped"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Market intelligence data will be available soon</p>
                <p className="text-sm text-gray-500">
                  This feature will provide insights on pricing trends, demand patterns, and competitor analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={onNavigateToInventory} variant="outline" className="h-auto p-4">
              <div className="text-center">
                <Package className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Manage Inventory</p>
                <p className="text-xs text-gray-500">View and edit your listings</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Price Research</p>
                <p className="text-xs text-gray-500">Optimize your pricing</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-center">
                <Target className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Create Rules</p>
                <p className="text-xs text-gray-500">Set up automation</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
