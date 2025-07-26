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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Truck, 
  Package,
  Clock,
  DollarSign,
  MapPin,
  Settings,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Plus,
  Edit,
  Printer,
  BarChart3
} from 'lucide-react';

const ShippingPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleBack = () => {
    navigate('/');
  };

  // Mock data for shipping management
  const pendingShipments = [
    {
      id: 1,
      item: "Nike Air Jordan 1 Retro",
      buyer: "john_doe_123",
      platform: "eBay",
      saleDate: "2024-01-15",
      amount: 220,
      shippingMethod: "USPS Priority",
      cost: 8.50,
      status: "label_needed",
      address: "123 Main St, Los Angeles, CA 90210"
    },
    {
      id: 2,
      item: "Coach Leather Handbag",
      buyer: "fashionista_sarah",
      platform: "Poshmark",
      saleDate: "2024-01-14",
      amount: 95,
      shippingMethod: "USPS Ground",
      cost: 12.00,
      status: "ready_to_ship",
      address: "456 Oak Ave, New York, NY 10001"
    },
    {
      id: 3,
      item: "iPhone 12 Pro Max",
      buyer: "tech_buyer_99",
      platform: "Mercari",
      saleDate: "2024-01-13",
      amount: 620,
      shippingMethod: "FedEx 2-Day",
      cost: 15.75,
      status: "shipped",
      trackingNumber: "1Z999AA1234567890",
      address: "789 Pine St, Chicago, IL 60601"
    }
  ];

  const shippingProfiles = [
    {
      id: 1,
      name: "Standard Electronics",
      weight: "1-3 lbs",
      dimensions: "12x8x4 in",
      carrier: "USPS Priority",
      cost: 8.50,
      deliveryTime: "2-3 days",
      isDefault: true
    },
    {
      id: 2,
      name: "Fashion Items",
      weight: "0.5-2 lbs",
      dimensions: "10x8x3 in",
      carrier: "USPS Ground",
      cost: 6.25,
      deliveryTime: "3-5 days",
      isDefault: false
    },
    {
      id: 3,
      name: "Heavy Items",
      weight: "3+ lbs",
      dimensions: "16x12x8 in",
      carrier: "FedEx Ground",
      cost: 12.00,
      deliveryTime: "2-4 days",
      isDefault: false
    }
  ];

  const shippingStats = {
    totalShipped: 127,
    avgCost: 9.25,
    avgTime: 2.8,
    onTimeRate: 96
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Shipping Management"
        subtitle="Streamline your shipping workflow"
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Items Shipped</p>
                      <p className="text-2xl font-bold text-blue-600">{shippingStats.totalShipped}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Shipping Cost</p>
                      <p className="text-2xl font-bold text-green-600">${shippingStats.avgCost}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Per package</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg. Delivery Time</p>
                      <p className="text-2xl font-bold text-purple-600">{shippingStats.avgTime} days</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Door to door</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">On-Time Rate</p>
                      <p className="text-2xl font-bold text-orange-600">{shippingStats.onTimeRate}%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-orange-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Delivery performance</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Quick Actions</CardTitle>
                <CardDescription>Manage your shipping workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Printer className="w-6 h-6" />
                    <span>Print Labels</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Package className="w-6 h-6" />
                    <span>Bulk Ship</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <BarChart3 className="w-6 h-6" />
                    <span>Shipping Reports</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Settings className="w-6 h-6" />
                    <span>Manage Profiles</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>📦 Recent Shipments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingShipments.slice(0, 3).map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          shipment.status === 'shipped' ? 'bg-green-500' : 
                          shipment.status === 'ready_to_ship' ? 'bg-blue-500' : 'bg-orange-500'
                        }`}></div>
                        <div>
                          <p className="font-medium">{shipment.item}</p>
                          <p className="text-sm text-gray-600">{shipment.buyer} • {shipment.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${shipment.amount}</p>
                        <Badge variant={
                          shipment.status === 'shipped' ? 'default' : 
                          shipment.status === 'ready_to_ship' ? 'secondary' : 'destructive'
                        }>
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Shipments Tab */}
          <TabsContent value="pending" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pending Shipments</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print All Labels
                </Button>
                <Button size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {pendingShipments.map((shipment) => (
                <Card key={shipment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="font-semibold text-lg">{shipment.item}</h3>
                          <Badge variant="secondary">{shipment.platform}</Badge>
                          <Badge variant={
                            shipment.status === 'shipped' ? 'default' : 
                            shipment.status === 'ready_to_ship' ? 'secondary' : 'destructive'
                          }>
                            {shipment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><span className="font-medium">Buyer:</span> {shipment.buyer}</p>
                            <p><span className="font-medium">Sale Date:</span> {shipment.saleDate}</p>
                            <p><span className="font-medium">Amount:</span> ${shipment.amount}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Method:</span> {shipment.shippingMethod}</p>
                            <p><span className="font-medium">Cost:</span> ${shipment.cost}</p>
                            {shipment.trackingNumber && (
                              <p><span className="font-medium">Tracking:</span> {shipment.trackingNumber}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm"><span className="font-medium">Ship to:</span> {shipment.address}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-6">
                        {shipment.status === 'label_needed' && (
                          <Button size="sm">
                            <Printer className="w-4 h-4 mr-2" />
                            Print Label
                          </Button>
                        )}
                        {shipment.status === 'ready_to_ship' && (
                          <Button size="sm">
                            <Truck className="w-4 h-4 mr-2" />
                            Mark Shipped
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Shipping Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Shipping Profiles</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shippingProfiles.map((profile) => (
                <Card key={profile.id} className={`hover:shadow-md transition-shadow ${profile.isDefault ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      {profile.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Weight Range:</span>
                        <span className="text-sm font-medium">{profile.weight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dimensions:</span>
                        <span className="text-sm font-medium">{profile.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Carrier:</span>
                        <span className="text-sm font-medium">{profile.carrier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cost:</span>
                        <span className="text-sm font-medium text-green-600">${profile.cost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Delivery:</span>
                        <span className="text-sm font-medium">{profile.deliveryTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      {!profile.isDefault && (
                        <Button variant="outline" size="sm">
                          Set Default
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold">Shipping Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-calculate">Auto-calculate shipping</Label>
                      <p className="text-sm text-gray-600">Automatically calculate shipping costs</p>
                    </div>
                    <Switch id="auto-calculate" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="free-shipping">Free shipping threshold</Label>
                      <p className="text-sm text-gray-600">Offer free shipping above this amount</p>
                    </div>
                    <Input className="w-24" placeholder="$50" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="handling-time">Handling time (days)</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="2">2 days</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Default Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Default Ship From Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Your full name" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address1">Address Line 1</Label>
                    <Input id="address1" placeholder="Street address" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" placeholder="State" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" placeholder="ZIP" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="Phone number" />
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Address
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="shipping"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title="Shipping"
        />
      )}
    </div>
  );
};

export default ShippingPage;
