import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateEbayConnection, cleanupExpiredEbayConnections, type EbayConnectionStatus } from '@/utils/ebayConnectionValidator';

interface DebugInfo {
  connectionStatus: EbayConnectionStatus | null;
  recentSyncs: any[];
  activeListings: any[];
  userProfile: any;
  isLoading: boolean;
}

const EbaySyncDebugDashboard: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connectionStatus: null,
    recentSyncs: [],
    activeListings: [],
    userProfile: null,
    isLoading: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    setDebugInfo(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Clean up expired connections first
      const cleanedUp = await cleanupExpiredEbayConnections();
      if (cleanedUp > 0) {
        console.log(`🧹 Cleaned up ${cleanedUp} expired eBay connections`);
      }

      // Get connection status
      const connectionStatus = await validateEbayConnection();

      // Get recent sync attempts
      const { data: recentSyncs } = await supabase
        .from('platform_listings')
        .select('*, listings(title)')
        .eq('platform', 'ebay')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get active eBay listings
      const { data: activeListings } = await supabase
        .from('platform_listings')
        .select('*, listings(title)')
        .eq('platform', 'ebay')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        userProfile = profile;
      }

      setDebugInfo({
        connectionStatus,
        recentSyncs: recentSyncs || [],
        activeListings: activeListings || [],
        userProfile,
        isLoading: false
      });

    } catch (error: any) {
      console.error('Failed to load debug info:', error);
      toast({
        title: "Debug Load Failed",
        description: error.message,
        variant: "destructive"
      });
      setDebugInfo(prev => ({ ...prev, isLoading: false }));
    }
  };

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: { action: 'test_shipping_service', userPreference: 'usps_priority' }
      });

      if (error) throw error;

      toast({
        title: "Connection Test Complete",
        description: `Status: ${data.status}. Check console for details.`,
        variant: data.status === 'test_complete' ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (debugInfo.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading debug information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">eBay Sync Debug Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testConnection}>
            Test Connection
          </Button>
          <Button variant="outline" size="sm" onClick={loadDebugInfo}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {debugInfo.connectionStatus?.isConnected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {debugInfo.connectionStatus ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Connected:</span> {debugInfo.connectionStatus.isConnected ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Token Valid:</span> {debugInfo.connectionStatus.isTokenValid ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Account:</span> {debugInfo.connectionStatus.accountUsername || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Expires:</span> {debugInfo.connectionStatus.expiresAt ? new Date(debugInfo.connectionStatus.expiresAt).toLocaleString() : 'N/A'}
                </div>
              </div>
              
              {debugInfo.connectionStatus.issues.length > 0 && (
                <Alert variant={debugInfo.connectionStatus.needsReconnection ? "destructive" : "default"}>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div>Issues detected:</div>
                    <ul className="list-disc list-inside mt-1">
                      {debugInfo.connectionStatus.issues.map((issue, i) => (
                        <li key={i} className="text-xs">{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>Failed to check connection status</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* User Profile Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            User Profile Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo.userProfile ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Payment Policy:</span> {debugInfo.userProfile.ebay_payment_policy_id || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Return Policy:</span> {debugInfo.userProfile.ebay_return_policy_id || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Fulfillment Policy:</span> {debugInfo.userProfile.ebay_fulfillment_policy_id || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Shipping Service:</span> {debugInfo.userProfile.preferred_shipping_service || 'usps_priority'}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No user profile found</p>
          )}
        </CardContent>
      </Card>

      {/* Active Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Active eBay Listings ({debugInfo.activeListings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo.activeListings.length > 0 ? (
            <div className="space-y-2">
              {debugInfo.activeListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{listing.listings?.title || 'Unknown'}</span>
                    <div className="text-xs text-gray-500">
                      ID: {listing.platform_listing_id} | Synced: {new Date(listing.last_synced_at || listing.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {getStatusBadge(listing.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active eBay listings found</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync Attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Attempts ({debugInfo.recentSyncs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo.recentSyncs.length > 0 ? (
            <div className="space-y-2">
              {debugInfo.recentSyncs.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{sync.listings?.title || 'Unknown'}</span>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(sync.created_at).toLocaleDateString()} | 
                      Last Sync: {sync.last_synced_at ? new Date(sync.last_synced_at).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                  {getStatusBadge(sync.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No sync attempts found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EbaySyncDebugDashboard;