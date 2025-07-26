import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

const PricingPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    navigate('/');
  };

  // Mock data for pricing intelligence
  const pricingOpportunities = [
    {
      id: 1,
      title: "Vintage Nike Air Jordan 1",
      currentPrice: 180,
      suggestedPrice: 220,
      potential: 40,
      confidence: 92,
      platform: "eBay",
      trend: "up",
      reason: "Similar items selling 22% higher"
    },
    {
      id: 2,
      title: "Coach Leather Handbag",
      currentPrice: 85,
      suggestedPrice: 95,
      potential: 10,
      confidence: 87,
      platform: "Poshmark",
      trend: "up",
      reason: "High demand in luxury category"
    },
    {
      id: 3,
      title: "iPhone 12 Pro Max",
      currentPrice: 650,
      suggestedPrice: 620,
      potential: -30,
      confidence: 95,
      platform: "Mercari",
      trend: "down",
      reason: "Market oversaturated, lower to sell faster"
    }
  ];

  const platformFees = [
    { platform: "eBay", fee: 12.9, takeHome: 87.1, volume: 45 },
    { platform: "Poshmark", fee: 20.0, takeHome: 80.0, volume: 23 },
    { platform: "Mercari", fee: 10.0, takeHome: 90.0, volume: 18 },
    { platform: "Depop", fee: 10.0, takeHome: 90.0, volume: 12 }
  ];

  const marketTrends = [
    { category: "Sneakers", trend: "up", change: "+15%", confidence: "High" },
    { category: "Electronics", trend: "down", change: "-8%", confidence: "Medium" },
    { category: "Fashion", trend: "up", change: "+12%", confidence: "High" },
    { category: "Collectibles", trend: "up", change: "+25%", confidence: "Medium" }
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Pricing Intelligence"
        subtitle="AI-powered pricing optimization"
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Profit Margin</p>
                      <p className="text-2xl font-bold text-green-600">68%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">+5% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Revenue Potential</p>
                      <p className="text-2xl font-bold text-blue-600">$340</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">From price optimization</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Items to Optimize</p>
                      <p className="text-2xl font-bold text-orange-600">12</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Pricing opportunities</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">AI Confidence</p>
                      <p className="text-2xl font-bold text-purple-600">91%</p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Prediction accuracy</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Quick Actions</CardTitle>
                <CardDescription>Optimize your pricing strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-auto p-4 flex flex-col items-center space-y-2">
                    <RefreshCw className="w-6 h-6" />
                    <span>Refresh All Prices</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <BarChart3 className="w-6 h-6" />
                    <span>Market Analysis</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Target className="w-6 h-6" />
                    <span>Set Price Alerts</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pricing Opportunities</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {pricingOpportunities.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span>Current: ${item.currentPrice}</span>
                          <span>Suggested: ${item.suggestedPrice}</span>
                          <Badge variant={item.potential > 0 ? "default" : "destructive"}>
                            {item.potential > 0 ? '+' : ''}${item.potential}
                          </Badge>
                          <Badge variant="secondary">{item.platform}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{item.reason}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {item.trend === 'up' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-sm font-medium">{item.confidence}% confident</span>
                        </div>
                        <Button size="sm">
                          Update Price
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <h2 className="text-xl font-semibold">Platform Fee Breakdown</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {platformFees.map((platform) => (
                <Card key={platform.platform}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {platform.platform}
                      <Badge variant="secondary">{platform.volume} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Platform Fee</span>
                        <span className="font-semibold text-red-600">{platform.fee}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Your Take-Home</span>
                        <span className="font-semibold text-green-600">{platform.takeHome}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${platform.takeHome}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        On a $100 sale, you keep ${platform.takeHome.toFixed(0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Market Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <h2 className="text-xl font-semibold">Market Trends</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketTrends.map((trend, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{trend.category}</h3>
                        <p className="text-sm text-gray-600">Market Movement</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {trend.trend === 'up' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`font-bold ${trend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.change}
                          </span>
                        </div>
                        <Badge variant="secondary" className="mt-1">
                          {trend.confidence} Confidence
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>💡 AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Sneakers are trending up 15%</p>
                      <p className="text-sm text-gray-600">Consider listing athletic footwear now for maximum profit</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Electronics market softening</p>
                      <p className="text-sm text-gray-600">Price competitively or consider holding until demand increases</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Fashion items gaining momentum</p>
                      <p className="text-sm text-gray-600">Spring season driving 12% increase in clothing sales</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="pricing"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title="Pricing"
        />
      )}
    </div>
  );
};

export default PricingPage;
