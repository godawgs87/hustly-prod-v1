import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Clock, 
  DollarSign, 
  Package, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Truck,
  MessageSquare,
  Zap
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'offer' | 'sale' | 'shipping' | 'pricing' | 'sync' | 'market';
  title: string;
  message: string;
  platform?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

const AlertsPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'offer',
      title: 'New eBay Offer Received',
      message: 'Buyer offered $45 for "Vintage Nike Sneakers" (Listed at $55)',
      platform: 'eBay',
      priority: 'high',
      timestamp: '5 minutes ago',
      isRead: false,
      actionRequired: true,
      actionUrl: '/sales'
    },
    {
      id: '2',
      type: 'sale',
      title: 'Item Sold on Mercari',
      message: '"Samsung Galaxy Case" sold for $12.99',
      platform: 'Mercari',
      priority: 'high',
      timestamp: '1 hour ago',
      isRead: false,
      actionRequired: true,
      actionUrl: '/sales'
    },
    {
      id: '3',
      type: 'shipping',
      title: 'Shipping Label Needed',
      message: '2 items need shipping labels created',
      priority: 'high',
      timestamp: '2 hours ago',
      isRead: false,
      actionRequired: true,
      actionUrl: '/shipping'
    },
    {
      id: '4',
      type: 'pricing',
      title: 'Price Drop Opportunity',
      message: '3 items could be repriced for +$45 potential profit',
      priority: 'medium',
      timestamp: '3 hours ago',
      isRead: false,
      actionRequired: false,
      actionUrl: '/pricing'
    },
    {
      id: '5',
      type: 'sync',
      title: 'Poshmark Sync Failed',
      message: 'Connection lost - please reconnect your account',
      platform: 'Poshmark',
      priority: 'medium',
      timestamp: '4 hours ago',
      isRead: true,
      actionRequired: true,
      actionUrl: '/settings'
    },
    {
      id: '6',
      type: 'market',
      title: 'Electronics Trending Up',
      message: 'Electronics category up 15% - good time to list',
      priority: 'low',
      timestamp: '6 hours ago',
      isRead: true,
      actionRequired: false,
      actionUrl: '/pricing'
    }
  ]);

  const handleBack = () => {
    navigate('/');
  };

  const handleAlertAction = (alert: Alert) => {
    if (alert.actionUrl) {
      navigate(alert.actionUrl);
    }
    markAsRead(alert.id);
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'offer': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'sale': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'shipping': return <Truck className="w-5 h-5 text-orange-500" />;
      case 'pricing': return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'sync': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'market': return <Zap className="w-5 h-5 text-yellow-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-gray-200 bg-gray-50';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const actionRequiredCount = alerts.filter(alert => alert.actionRequired && !alert.isRead).length;

  const filterAlerts = (filter: string) => {
    switch (filter) {
      case 'unread':
        return alerts.filter(alert => !alert.isRead);
      case 'action':
        return alerts.filter(alert => alert.actionRequired);
      case 'all':
      default:
        return alerts;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Alerts & Notifications"
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Notifications</h2>
            <p className="text-muted-foreground">
              {unreadCount} unread • {actionRequiredCount} need action
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="action">Action Required ({actionRequiredCount})</TabsTrigger>
          </TabsList>

          {['all', 'unread', 'action'].map((filter) => (
            <TabsContent key={filter} value={filter} className="space-y-4">
              {filterAlerts(filter).length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                      <p className="text-muted-foreground">No {filter} notifications</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filterAlerts(filter).map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !alert.isRead ? getPriorityColor(alert.priority) : 'border-gray-200'
                    }`}
                    onClick={() => handleAlertAction(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-medium ${!alert.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                {alert.title}
                              </h3>
                              {!alert.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <p className={`text-sm ${!alert.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {alert.timestamp}
                              </div>
                              {alert.platform && (
                                <Badge variant="outline" className="text-xs">
                                  {alert.platform}
                                </Badge>
                              )}
                              {alert.actionRequired && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="alerts"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title="Alerts"
        />
      )}
    </div>
  );
};

export default AlertsPage;
