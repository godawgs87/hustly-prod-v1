import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EbayOAuthConnection from './EbayOAuthConnection';
import EbayPolicyManager from './EbayPolicyManager';

interface EbayAccount {
  id: string;
  account_username?: string;
  account_email?: string;
  is_connected: boolean;
  oauth_expires_at?: string;
  last_sync_at?: string;
}

const EbayConnectionCard = () => {
  const [ebayAccount, setEbayAccount] = useState<EbayAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEbayAccount();
  }, []);

  const loadEbayAccount = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'ebay')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setEbayAccount(accounts?.[0] || null);
    } catch (error) {
      console.error('Error loading eBay account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!ebayAccount) return;

    try {
      const { error } = await supabase
        .from('marketplace_accounts')
        .update({ is_connected: false, is_active: false })
        .eq('id', ebayAccount.id);

      if (error) throw error;

      toast({
        title: "eBay Disconnected",
        description: "Your eBay account has been disconnected successfully"
      });

      setEbayAccount(null);
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const isTokenExpired = () => {
    if (!ebayAccount?.oauth_expires_at) return false;
    return new Date(ebayAccount.oauth_expires_at) < new Date();
  };

  const getConnectionStatus = () => {
    if (!ebayAccount?.is_connected) return { status: 'disconnected', color: 'destructive' };
    if (isTokenExpired()) return { status: 'expired', color: 'destructive' };
    return { status: 'connected', color: 'default' };
  };

  const connectionStatus = getConnectionStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading eBay connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {ebayAccount?.is_connected && !isTokenExpired() ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            eBay Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ebayAccount?.is_connected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Connected Account</h4>
                  <p className="text-sm text-gray-600">{ebayAccount.account_username || ebayAccount.account_email}</p>
                </div>
                <Badge variant={connectionStatus.color as any}>
                  {connectionStatus.status === 'connected' ? 'Connected' : 
                   connectionStatus.status === 'expired' ? 'Token Expired' : 'Disconnected'}
                </Badge>
              </div>

              {connectionStatus.status === 'expired' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-medium text-yellow-800">Token Expired</h5>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your eBay connection has expired. Please reconnect to continue listing items.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://www.ebay.com/mys/summary', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on eBay
                </Button>
              </div>
            </>
          ) : (
            <EbayOAuthConnection onConnectionSuccess={loadEbayAccount} />
          )}
        </CardContent>
      </Card>

      {/* Show policy manager only if connected */}
      {ebayAccount?.is_connected && !isTokenExpired() && (
        <EbayPolicyManager />
      )}
    </div>
  );
};

export default EbayConnectionCard;