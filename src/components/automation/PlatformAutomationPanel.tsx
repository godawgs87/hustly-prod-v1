import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  TrendingUp, 
  RotateCcw, 
  Share2, 
  Gavel, 
  Settings, 
  Play, 
  Pause,
  Plus,
  Calendar,
  DollarSign
} from 'lucide-react';
import { usePlatformAutomation } from '@/hooks/usePlatformAutomation';

interface PlatformAutomationPanelProps {
  listingId: string;
  platforms: string[];
  className?: string;
}

export function PlatformAutomationPanel({ listingId, platforms, className }: PlatformAutomationPanelProps) {
  const {
    automationRules,
    activePromotions,
    isLoading,
    createMercariPromotion,
    schedulePoshmarkSharing,
    scheduleEbayAuctionUpgrade,
    createSmartRelistRule,
    implementDynamicPricing,
    toggleAutomationRule
  } = usePlatformAutomation();

  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0] || '');
  const [relistStrategy, setRelistStrategy] = useState<'aggressive' | 'moderate' | 'conservative'>('moderate');
  const [pricingSchedule, setPricingSchedule] = useState([
    { days: 7, reduction: 5 },
    { days: 14, reduction: 10 },
    { days: 21, reduction: 15 }
  ]);

  const listingRules = automationRules.filter(rule => rule.listingId === listingId);
  const listingPromotions = activePromotions.filter(promo => promo.listingId === listingId);

  const handleCreateMercariPromotion = async (type: 'price_drop' | 'boost' | 'featured') => {
    await createMercariPromotion(listingId, type);
  };

  const handleSchedulePoshmarkSharing = async () => {
    const schedule = ['morning', 'afternoon', 'evening']; // Default schedule
    await schedulePoshmarkSharing(listingId, schedule);
  };

  const handleScheduleEbayAuction = async () => {
    await scheduleEbayAuctionUpgrade(listingId, {
      daysSinceListed: 14,
      viewThreshold: 50
    });
  };

  const handleCreateRelistRule = async () => {
    await createSmartRelistRule(listingId, selectedPlatform, relistStrategy);
  };

  const handleImplementDynamicPricing = async () => {
    const strategy = {
      platform: selectedPlatform,
      basePrice: 0, // Would get from listing
      priceDropSchedule: pricingSchedule,
      minimumPrice: 0 // Would calculate from listing
    };
    await implementDynamicPricing(listingId, strategy);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Platform Automation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {/* Active Automation Rules */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Active Rules</h4>
              {listingRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No automation rules configured</p>
              ) : (
                listingRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      {rule.ruleType === 'relist' && <RotateCcw className="w-4 h-4" />}
                      {rule.ruleType === 'price_drop' && <TrendingUp className="w-4 h-4" />}
                      {rule.ruleType === 'sharing' && <Share2 className="w-4 h-4" />}
                      {rule.ruleType === 'auction_upgrade' && <Gavel className="w-4 h-4" />}
                      
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {rule.ruleType.replace('_', ' ')} - {rule.platform}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Next: {rule.nextExecution ? new Date(rule.nextExecution).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch 
                        checked={rule.isActive}
                        onCheckedChange={() => toggleAutomationRule(rule.id)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="promotions" className="space-y-4">
            {/* Platform-specific Promotions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mercari Promotions */}
              {platforms.includes('mercari') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Mercari Promotions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCreateMercariPromotion('boost')}
                      disabled={isLoading}
                      className="w-full gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Boost Listing
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCreateMercariPromotion('price_drop')}
                      disabled={isLoading}
                      className="w-full gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Price Drop Alert
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Poshmark Sharing */}
              {platforms.includes('poshmark') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Poshmark Sharing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleSchedulePoshmarkSharing}
                      disabled={isLoading}
                      className="w-full gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Schedule Auto-Share
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* eBay Auctions */}
              {platforms.includes('ebay') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">eBay Automation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleScheduleEbayAuction}
                      disabled={isLoading}
                      className="w-full gap-2"
                    >
                      <Gavel className="w-4 h-4" />
                      Auto Auction Upgrade
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Active Promotions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Active Promotions</h4>
              {listingPromotions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active promotions</p>
              ) : (
                listingPromotions.map((promo) => (
                  <div key={promo.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {promo.promotionType.replace('_', ' ')} - {promo.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(promo.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="default">{promo.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            {/* Automation Setup */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Smart Relist Setup */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Smart Relist Strategy
                </h4>
                <Select value={relistStrategy} onValueChange={(value: any) => setRelistStrategy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">Aggressive (7 days, 10% drop)</SelectItem>
                    <SelectItem value="moderate">Moderate (14 days, 5% drop)</SelectItem>
                    <SelectItem value="conservative">Conservative (21 days, 3% drop)</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleCreateRelistRule}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Relist Rule
                </Button>
              </div>

              <Separator />

              {/* Dynamic Pricing Setup */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Dynamic Pricing Schedule
                </h4>
                {pricingSchedule.map((schedule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={schedule.days}
                      onChange={(e) => {
                        const newSchedule = [...pricingSchedule];
                        newSchedule[index].days = parseInt(e.target.value);
                        setPricingSchedule(newSchedule);
                      }}
                      className="w-20"
                      placeholder="Days"
                    />
                    <span className="text-sm">days:</span>
                    <Input 
                      type="number" 
                      value={schedule.reduction}
                      onChange={(e) => {
                        const newSchedule = [...pricingSchedule];
                        newSchedule[index].reduction = parseInt(e.target.value);
                        setPricingSchedule(newSchedule);
                      }}
                      className="w-20"
                      placeholder="%"
                    />
                    <span className="text-sm">% off</span>
                  </div>
                ))}
                <Button 
                  size="sm" 
                  onClick={handleImplementDynamicPricing}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Activate Dynamic Pricing
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}