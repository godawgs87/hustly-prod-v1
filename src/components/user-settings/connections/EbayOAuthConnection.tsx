import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EbayOAuthConnectionProps {
  onConnectionSuccess?: () => void;
}

const EbayOAuthConnection: React.FC<EbayOAuthConnectionProps> = ({ onConnectionSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [ebayAccount, setEbayAccount] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingConnection();
    handleOAuthCallback();
  }, []);

  const cleanupExpiredConnections = async () => {
    try {
      // Clean up any expired eBay connections for the current user
      const { error } = await supabase
        .from('marketplace_accounts')
        .update({ 
          is_active: false, 
          is_connected: false,
          oauth_token: null,
          refresh_token: null
        })
        .eq('platform', 'ebay')
        .lt('oauth_expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired connections:', error);
      } else {
        console.log('✅ Cleaned up expired eBay connections');
      }
    } catch (error) {
      console.error('Error in cleanup function:', error);
    }
  };

  const checkExistingConnection = async () => {
    try {
      // First clean up any expired connections
      await cleanupExpiredConnections();

      // Now check for active connections
      const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_active', true)
        .eq('is_connected', true)
        .maybeSingle();

      console.log('🔍 eBay connection check:', data);
      
      // Validate the connection more thoroughly
      if (data && data.oauth_token && data.oauth_token.length > 50) {
        // Double-check token expiration
        if (data.oauth_expires_at && new Date(data.oauth_expires_at) < new Date()) {
          console.log('⚠️ Found expired token, cleaning up...');
          
          await supabase
            .from('marketplace_accounts')
            .update({ 
              is_active: false, 
              is_connected: false,
              oauth_token: null,
              refresh_token: null
            })
            .eq('id', data.id);
          
          setEbayAccount(null);
          toast({
            title: "eBay Token Expired",
            description: "Your eBay connection has expired. Please reconnect your account.",
            variant: "destructive"
          });
        } else {
          console.log('✅ Valid eBay OAuth connection found');
          setEbayAccount(data);
        }
      } else {
        console.log('⚠️ No valid eBay OAuth connection found');
        setEbayAccount(null);
      }
    } catch (error) {
      console.error('❌ Error checking eBay connection:', error);
      toast({
        title: "Connection Check Failed",
        description: "Unable to verify eBay connection status. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOAuthCallback = async () => {
    // Check if we're returning from eBay OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ eBay OAuth error:', error);
      toast({
        title: "eBay Authorization Failed",
        description: `eBay returned an error: ${error}`,
        variant: "destructive"
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state === 'ebay_oauth') {
      setLoading(true);
      console.log('🔄 Processing eBay OAuth callback...');
      
      try {
        // Ensure user is still authenticated for the callback
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Authentication session expired. Please log in again.');
        }

        console.log('✅ Session verified, exchanging code for token...');

        // Exchange code for access token via our edge function
        const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
          body: { action: 'exchange_code', code },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Token exchange response:', { data, error });

        if (error) {
          console.error('❌ Token exchange error:', error);
          throw new Error(`Token exchange failed: ${error.message || 'Unknown error'}`);
        }

        if (data?.status !== 'success') {
          console.error('❌ Unexpected response format:', data);
          throw new Error('Unexpected response from eBay connection service');
        }

        console.log('✅ eBay OAuth successful!');

        toast({
          title: "eBay Connected Successfully! 🎉",
          description: "Your eBay account is now linked to Hustly"
        });

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh connection status and notify parent
        await checkExistingConnection();
        if (onConnectionSuccess) {
          onConnectionSuccess();
        }
      } catch (error: any) {
        console.error('❌ OAuth callback failed:', error);
        
        let errorMessage = error.message;
        if (error.message?.includes('Authentication session')) {
          errorMessage = 'Your session expired during the connection process. Please try connecting again.';
        } else if (error.message?.includes('Token exchange failed')) {
          errorMessage = 'Failed to complete eBay connection. Please try again or contact support.';
        }
        
        toast({
          title: "eBay Connection Failed",
          description: errorMessage,
          variant: "destructive"
        });

        // Clean URL even on error
        window.history.replaceState({}, document.title, window.location.pathname);
      } finally {
        setLoading(false);
      }
    }
  };

  const initiateOAuthFlow = async () => {
    setLoading(true);
    console.log('🚀 Initiating eBay OAuth flow...');
    
    try {
      // Ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to connect eBay. Please refresh the page and try again.');
      }

      console.log('✅ User session verified, calling edge function...');

      // Get OAuth URL from our edge function with proper auth headers
      const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
        body: { action: 'get_auth_url', state: 'ebay_oauth' },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`OAuth setup failed: ${error.message || 'Unknown edge function error'}`);
      }

      if (!data?.auth_url) {
        console.error('❌ No auth URL in response:', data);
        throw new Error('Invalid response from OAuth service - missing authorization URL');
      }

      console.log('🔗 Redirecting to eBay OAuth:', data.auth_url.substring(0, 80) + '...');
      
      // Redirect to eBay OAuth
      window.location.href = data.auth_url;
    } catch (error: any) {
      console.error('❌ OAuth flow initiation failed:', error);
      
      let errorMessage = error.message;
      
      // Provide more helpful error messages for common issues
      if (error.message?.includes('Authorization header')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message?.includes('Missing eBay credentials')) {
        errorMessage = 'eBay integration is not properly configured. Please contact support.';
      } else if (error.message?.includes('Invalid JSON')) {
        errorMessage = 'Communication error with eBay service. Please try again.';
      }
      
      toast({
        title: "eBay Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!ebayAccount) return;

    try {
      const { error } = await supabase
        .from('marketplace_accounts')
        .update({ is_active: false })
        .eq('id', ebayAccount.id);

      if (error) throw error;

      setEbayAccount(null);
      toast({
        title: "eBay Disconnected",
        description: "Your eBay account has been disconnected"
      });
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setCheckingStatus(true);
    await checkExistingConnection();
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking eBay connection…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ebayAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            eBay Account Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{ebayAccount.account_username}</p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>✅ Ready to sync listings to eBay</p>
            <p>✅ Inventory management enabled</p>
            <p>✅ Order tracking available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Connect Your eBay Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 space-y-2">
          <p>Connect your existing eBay seller account to start syncing listings.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Secure OAuth connection</li>
            <li>No developer account required</li>
            <li>Automatic inventory sync</li>
            <li>Real-time order updates</li>
          </ul>
        </div>

        <Button 
          onClick={initiateOAuthFlow} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect eBay Account
            </>
          )}
        </Button>
        
        <div className="text-xs text-gray-500">
          🔒 Your eBay credentials are never stored. We only receive a secure access token.
        </div>
      </CardContent>
    </Card>
  );
};

export default EbayOAuthConnection;