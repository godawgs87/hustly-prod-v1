
import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Database, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const systemStats = {
    totalUsers: 1247,
    activeListings: 3456,
    totalRevenue: 89340,
    systemHealth: 'good'
  };

  const recentActivity = [
    { id: 1, user: 'john@example.com', action: 'Created listing', timestamp: '2 mins ago' },
    { id: 2, user: 'sarah@example.com', action: 'Updated inventory', timestamp: '5 mins ago' },
    { id: 3, user: 'mike@example.com', action: 'Deleted listing', timestamp: '8 mins ago' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StreamlinedHeader 
        title="Admin Dashboard" 
        userEmail={user?.email}
        showBack={false}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Administration</h1>
          <p className="text-gray-600">Monitor and manage your Smart Listing Generator platform</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Listings</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.activeListings.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${systemStats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <Badge variant="default" className="mt-1">
                      {systemStats.systemHealth === 'good' ? 'Healthy' : 'Issues'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{activity.user}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {activity.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Management</h3>
              <p className="text-gray-600">User management features coming soon...</p>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Monitoring</h3>
              <p className="text-gray-600">System monitoring tools coming soon...</p>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Platform Settings</h3>
              <p className="text-gray-600">Platform configuration options coming soon...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
