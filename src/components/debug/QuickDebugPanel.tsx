import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const QuickDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

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
          expires_at: ebayAccount.oauth_expires_at
        } : { status: 'not_connected', error: ebayError };

        // Check eBay categories count
        const { count: categoryCount } = await supabase
          .from('ebay_categories')
          .select('*', { count: 'exact', head: true });
        
        info.categories = { count: categoryCount || 0 };

        // Check recent listings
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, sku, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        info.listings = { 
          count: listings?.length || 0, 
          recent: listings,
          error: listingsError 
        };
      }
    } catch (error) {
      info.error = error;
    }

    setDebugInfo(info);
    setLoading(false);
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
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">Checking systems...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Status Debug</CardTitle>
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

        {/* Categories */}
        <div className="flex items-center justify-between">
          <span className="font-medium">eBay Categories</span>
          <div className="flex items-center gap-2">
            {debugInfo.categories?.count > 25 ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            )}
            <Badge variant={debugInfo.categories?.count > 25 ? 'default' : 'secondary'}>
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
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            )}
            <Badge variant="outline">
              {debugInfo.listings?.count} listings
            </Badge>
          </div>
        </div>

        {/* Recent listings details */}
        {debugInfo.listings?.recent && debugInfo.listings.recent.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium text-sm mb-2">Recent Listings:</h4>
            {debugInfo.listings.recent.map((listing: any) => (
              <div key={listing.id} className="text-xs text-muted-foreground">
                • {listing.title} ({listing.sku || 'No SKU'}) - {listing.status}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t">
          <Button size="sm" onClick={checkAllSystems}>
            Refresh
          </Button>
          {debugInfo.ebay?.status !== 'connected' && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings'}>
              Connect eBay
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickDebugPanel;