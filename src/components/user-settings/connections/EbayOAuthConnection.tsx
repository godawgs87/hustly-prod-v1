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

  const checkExistingConnection = async () => {
    try {
      const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_active', true)
        .maybeSingle();

      console.log('🔍 eBay connection check:', data);
      
      // Check if this is a real OAuth connection by validating token format and length
      if (data && data.oauth_token && data.oauth_token.length > 50 && data.is_connected) {
        console.log('✅ Found real eBay OAuth connection');
        
        // Check if token is expired
        if (data.oauth_expires_at && new Date(data.oauth_expires_at) < new Date()) {
          console.log('⚠️ eBay token expired, cleaning up and treating as disconnected');
          
          // Clean up expired connection
          await supabase
            .from('marketplace_accounts')
            .update({ is_active: false, is_connected: false })
            .eq('id', data.id);
          
          setEbayAccount(null);
          toast({
            title: "eBay Token Expired",
            description: "Your eBay connection has expired. Please reconnect your account.",
            variant: "destructive"
          });
        } else {
          setEbayAccount(data);
        }
      } else {
        console.log('⚠️ No valid eBay OAuth connection found');
        setEbayAccount(null);
      }
    } catch (error) {
      console.error('Error checking eBay connection:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOAuthCallback = async () => {
    // Check if we're returning from eBay OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state === 'ebay_oauth') {
      setLoading(true);
      try {
        // Exchange code for access token via our edge function
        const { data, error } = await supabase.functions.invoke('ebay-oauth', {
          body: { action: 'exchange_code', code }
        });

        if (error) throw error;

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
        toast({
          title: "Connection Failed",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const initiateOAuthFlow = async () => {
    setLoading(true);
    try {
      // Get OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('ebay-oauth', {
        body: { action: 'get_auth_url', state: 'ebay_oauth' }
      });

      if (error) throw error;

      // Redirect to eBay OAuth
      window.location.href = data.auth_url;
    } catch (error: any) {
      toast({
        title: "OAuth Setup Failed",
        description: error.message,
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