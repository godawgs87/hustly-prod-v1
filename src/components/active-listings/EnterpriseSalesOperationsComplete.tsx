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

export default function EnterpriseSalesOperationsComplete({ onNavigateToInventory }: EnterpriseSalesOperationsProps) {
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
      // Create some default automation rules with simplified structure
      const defaultRules = [
        {
          name: 'Auto-delist stale listings',
          condition: 'days_listed',
          conditionValue: '30',
          action: 'delist',
          actionValue: '',
          enabled: true,
          type: 'delist',
          conditions: [{ field: 'days_listed', operator: 'gt', value: 30 }],
          actions: [{ type: 'delist', parameters: {} }],
          priority: 1
        },
        {
          name: 'Reduce price after 14 days',
          condition: 'days_listed',
          conditionValue: '14',
          action: 'adjust_price',
          actionValue: '-10',
          enabled: true,
          type: 'adjust_price',
          conditions: [{ field: 'days_listed', operator: 'gt', value: 14 }],
          actions: [{ type: 'adjust_price', parameters: { percentage: -10 } }],
          priority: 2
        },
        {
          name: 'Promote high-view items',
          condition: 'views',
          conditionValue: '50',
          action: 'promote',
          actionValue: '',
          enabled: true,
          type: 'promote',
          conditions: [{ field: 'views', operator: 'gt', value: 50 }],
          actions: [{ type: 'promote', parameters: { boost_level: 'medium' } }],
          priority: 3
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
      const ruleData = {
        ...ruleForm,
        type: ruleForm.action,
        conditions: [{ 
          field: ruleForm.condition, 
          operator: 'gt', 
          value: parseInt(ruleForm.conditionValue) || 0 
        }],
        actions: [{ 
          type: ruleForm.action, 
          parameters: ruleForm.actionValue ? { value: ruleForm.actionValue } : {} 
        }],
        priority: 1
      };

      if (editingRule) {
        await salesEngine.updateRule(editingRule.id, ruleData);
        toast({
          title: "Rule Updated",
          description: "Automation rule has been updated",
        });
      } else {
        await salesEngine.createRule(ruleData);
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
      condition: rule.condition || 'days_listed',
      conditionValue: rule.conditionValue || '',
      action: rule.action || 'delist',
      actionValue: rule.actionValue || '',
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            Enterprise Sales Operations
          </h2>
          <p className="text-gray-600 mt-1">
            Automated listing management and optimization
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={automationRunning}
              onCheckedChange={handleToggleAutomation}
            />
            <span className="text-sm font-medium">
              {automationRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <Badge variant={automationRunning ? "default" : "secondary"}>
            {automationRunning ? (
              <>
                <Play className="w-3 h-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Paused
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold">{metrics.activeRules}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold">{metrics.totalListings}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue Impact</p>
                <p className="text-2xl font-bold">$0</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Automation Rules</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCreateDefaultRules}>
                <Settings className="w-4 h-4 mr-2" />
                Create Default Rules
              </Button>
              <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateRuleDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRule ? 'Edit Rule' : 'Create New Rule'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={ruleForm.name}
                        onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                        placeholder="Enter rule name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition">Condition</Label>
                      <Select value={ruleForm.condition} onValueChange={(value) => setRuleForm({ ...ruleForm, condition: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days_listed">Days Listed</SelectItem>
                          <SelectItem value="views">Views</SelectItem>
                          <SelectItem value="watchers">Watchers</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="conditionValue">Condition Value</Label>
                      <Input
                        id="conditionValue"
                        value={ruleForm.conditionValue}
                        onChange={(e) => setRuleForm({ ...ruleForm, conditionValue: e.target.value })}
                        placeholder="Enter threshold value"
                      />
                    </div>
                    <div>
                      <Label htmlFor="action">Action</Label>
                      <Select value={ruleForm.action} onValueChange={(value) => setRuleForm({ ...ruleForm, action: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delist">Delist</SelectItem>
                          <SelectItem value="adjust_price">Adjust Price</SelectItem>
                          <SelectItem value="promote">Promote</SelectItem>
                          <SelectItem value="relist">Relist</SelectItem>
                          <SelectItem value="cross_list">Cross-list</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {ruleForm.action === 'adjust_price' && (
                      <div>
                        <Label htmlFor="actionValue">Price Adjustment (%)</Label>
                        <Input
                          id="actionValue"
                          value={ruleForm.actionValue}
                          onChange={(e) => setRuleForm({ ...ruleForm, actionValue: e.target.value })}
                          placeholder="e.g., -10 for 10% decrease"
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={ruleForm.enabled}
                        onCheckedChange={(enabled) => setRuleForm({ ...ruleForm, enabled })}
                      />
                      <Label htmlFor="enabled">Enable rule</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleCreateRule} className="flex-1">
                        {editingRule ? 'Update Rule' : 'Create Rule'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Created</h3>
                  <p className="text-gray-600 mb-4">
                    Create automation rules to automatically manage your listings based on performance metrics.
                  </p>
                  <Button onClick={handleCreateDefaultRules} variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Create Default Rules
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          When <strong>{getConditionLabel(rule.condition || 'days_listed')}</strong> is greater than{' '}
                          <strong>{rule.conditionValue || 'N/A'}</strong>, then{' '}
                          <strong>{getActionLabel(rule.action || 'delist')}</strong>
                          {rule.actionValue && ` by ${rule.actionValue}%`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => handleToggleRule(rule.id, enabled)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Automation Impact</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Items Processed</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue Generated</span>
                      <span className="font-medium">$0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Time Saved</span>
                      <span className="font-medium">0 hours</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rule Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Most Active Rule</span>
                      <span className="font-medium">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. Processing Time</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Market Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Market Intelligence Coming Soon</h3>
                <p className="text-gray-600 mb-4">
                  Advanced market analysis, pricing recommendations, and demand forecasting will be available here.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <h4 className="font-medium">Price Optimization</h4>
                    <p className="text-sm text-gray-600">AI-powered pricing recommendations</p>
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium">Demand Forecasting</h4>
                    <p className="text-sm text-gray-600">Predict market trends and demand</p>
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium">Competitive Analysis</h4>
                    <p className="text-sm text-gray-600">Monitor competitor pricing and strategies</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={onNavigateToInventory} className="h-auto p-4">
              <div className="text-center">
                <Package className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Manage Inventory</div>
                <div className="text-sm text-gray-600">View and edit listings</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Price Research</div>
                <div className="text-sm text-gray-600">Analyze market prices</div>
              </div>
            </Button>
            <Button variant="outline" onClick={openCreateRuleDialog} className="h-auto p-4">
              <div className="text-center">
                <Plus className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Create Rule</div>
                <div className="text-sm text-gray-600">Add automation rule</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
