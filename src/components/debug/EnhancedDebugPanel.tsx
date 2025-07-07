import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Settings, Bug, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EnhancedDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAllSystems();
  }, []);

  const checkAllSystems = async () => {
    setLoading(true);
    const info: any = {};

    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      info.auth = user ? { status: 'connected', email: user.email } : { status: 'not_connected' };

      if (user) {
        // Check user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        info.profile = profile ? { status: 'found', ...profile } : { status: 'missing', error: profileError };

        // Check eBay connection
        const { data: ebayAccount, error: ebayError } = await supabase
          .from('marketplace_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'ebay')
          .maybeSingle();
        
        info.ebay = ebayAccount ? { 
          status: 'connected', 
          username: ebayAccount.account_username,
          is_active: ebayAccount.is_active,
          is_connected: ebayAccount.is_connected,
          expires_at: ebayAccount.oauth_expires_at,
          token_length: ebayAccount.oauth_token?.length || 0
        } : { status: 'not_connected', error: ebayError };

        // Check eBay categories count
        const { count: categoryCount } = await supabase
          .from('ebay_categories')
          .select('*', { count: 'exact', head: true });
        
        info.categories = { count: categoryCount || 0 };

        // Check recent listings
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, sku, status, created_at, ebay_category_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        info.listings = { 
          count: listings?.length || 0, 
          recent: listings,
          error: listingsError 
        };

        // Check platform listings (sync attempts)
        const { data: platformListings, count: platformCount } = await supabase
          .from('platform_listings')
          .select('id, listing_id, platform, status, sync_status, created_at, platform_listing_id')
          .eq('user_id', user.id)
          .eq('platform', 'ebay')
          .order('created_at', { ascending: false })
          .limit(5);

        info.platformListings = {
          count: platformCount || 0,
          recent: platformListings || [],
          totalSynced: platformListings?.filter(p => p.status === 'active').length || 0
        };

        // Check posting queue
        const { count: queueCount } = await supabase
          .from('posting_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('platform', 'ebay');

        info.postingQueue = { count: queueCount || 0 };
      }
    } catch (error) {
      console.error('Debug panel error:', error);
      info.error = error;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const syncCategories = async () => {
    setSyncing(true);
    try {
      console.log('🔄 Triggering eBay category sync...');
      
      const { data, error } = await supabase.functions.invoke('ebay-category-sync', {
        body: { action: 'sync_categories' }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Category sync result:', data);
      
      toast({
        title: "Categories Synced",
        description: `Successfully synced eBay categories`,
      });

      // Refresh debug info
      await checkAllSystems();
    } catch (error: any) {
      console.error('❌ Category sync failed:', error);
      toast({
        title: "Sync Failed",
        description: `Failed to sync categories: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const testEbayConnection = async () => {
    setSyncing(true);
    try {
      console.log('🔄 Testing eBay connection...');
      
      const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: { 
          listingId: 'test-listing-id',
          dryRun: true
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ eBay connection test result:', data);
      
      toast({
        title: "Connection Test",
        description: data?.message || "eBay connection test completed",
        variant: data?.status === 'dry_run_success' ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('❌ eBay connection test failed:', error);
      toast({
        title: "Connection Test Failed",
        description: `eBay test failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'found':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'not_connected':
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking systems...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasIssues = debugInfo.ebay?.status !== 'connected' || 
                    (debugInfo.categories?.count || 0) < 100 ||
                    (debugInfo.platformListings?.count || 0) === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Enhanced System Debug
          {hasIssues && <AlertTriangle className="w-5 h-5 text-orange-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Status */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Authentication</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(debugInfo.auth?.status)}
            <Badge variant={debugInfo.auth?.status === 'connected' ? 'default' : 'destructive'}>
              {debugInfo.auth?.status}
            </Badge>
            {debugInfo.auth?.email && (
              <span className="text-sm text-muted-foreground">{debugInfo.auth.email}</span>
            )}
          </div>
        </div>

        {/* Profile Status */}
        <div className="flex items-center justify-between">
          <span className="font-medium">User Profile</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(debugInfo.profile?.status)}
            <Badge variant={debugInfo.profile?.status === 'found' ? 'default' : 'destructive'}>
              {debugInfo.profile?.status}
            </Badge>
          </div>
        </div>

        {/* eBay Connection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">eBay Connection</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.ebay?.status)}
              <Badge variant={debugInfo.ebay?.status === 'connected' ? 'default' : 'destructive'}>
                {debugInfo.ebay?.status}
              </Badge>
              {debugInfo.ebay?.username && (
                <span className="text-sm text-muted-foreground">{debugInfo.ebay.username}</span>
              )}
            </div>
          </div>
          
          {debugInfo.ebay?.status === 'connected' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Active: {debugInfo.ebay.is_active ? 'Yes' : 'No'}</div>
              <div>• Connected: {debugInfo.ebay.is_connected ? 'Yes' : 'No'}</div>
              <div>• Token Length: {debugInfo.ebay.token_length} chars</div>
              {debugInfo.ebay.expires_at && (
                <div>• Expires: {new Date(debugInfo.ebay.expires_at).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="flex items-center justify-between">
          <span className="font-medium">eBay Categories</span>
          <div className="flex items-center gap-2">
            {debugInfo.categories?.count > 100 ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            )}
            <Badge variant={debugInfo.categories?.count > 100 ? 'default' : 'secondary'}>
              {debugInfo.categories?.count} categories
            </Badge>
          </div>
        </div>

        {/* Listings */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Recent Listings</span>
          <div className="flex items-center gap-2">
            {debugInfo.listings?.count > 0 ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            )}
            <Badge variant="outline">
              {debugInfo.listings?.count} listings
            </Badge>
          </div>
        </div>

        {/* Platform Listings (Sync Status) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">eBay Sync Status</span>
            <div className="flex items-center gap-2">
              {debugInfo.platformListings?.count > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <Badge variant={debugInfo.platformListings?.count > 0 ? 'default' : 'destructive'}>
                {debugInfo.platformListings?.totalSynced} synced
              </Badge>
              <Badge variant="outline">
                {debugInfo.platformListings?.count} attempts
              </Badge>
            </div>
          </div>
          
          {debugInfo.platformListings?.recent && debugInfo.platformListings.recent.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium">Recent Sync Attempts:</div>
              {debugInfo.platformListings.recent.slice(0, 3).map((pl: any) => (
                <div key={pl.id}>
                  • {pl.sync_status} - {pl.status} {pl.platform_listing_id ? `(${pl.platform_listing_id})` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Posting Queue */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Posting Queue</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {debugInfo.postingQueue?.count} queued
            </Badge>
          </div>
        </div>

        {/* Critical Issues Alert */}
        {hasIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Critical Issues Detected:</div>
                {debugInfo.ebay?.status !== 'connected' && (
                  <div>• eBay account not properly connected</div>
                )}
                {(debugInfo.categories?.count || 0) < 100 && (
                  <div>• eBay categories incomplete ({debugInfo.categories?.count} loaded)</div>
                )}
                {(debugInfo.platformListings?.count || 0) === 0 && (
                  <div>• No eBay sync attempts recorded (sync pipeline broken)</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t flex-wrap">
          <Button size="sm" onClick={checkAllSystems} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={syncCategories}
            disabled={syncing}
          >
            <Zap className={`w-4 h-4 mr-1 ${syncing ? 'animate-pulse' : ''}`} />
            Sync Categories
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={testEbayConnection}
            disabled={syncing || debugInfo.ebay?.status !== 'connected'}
          >
            <Bug className={`w-4 h-4 mr-1 ${syncing ? 'animate-pulse' : ''}`} />
            Test eBay
          </Button>
          
          {debugInfo.ebay?.status !== 'connected' && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings?tab=connections'}>
              <Settings className="w-4 h-4 mr-1" />
              Connect eBay
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedDebugPanel;