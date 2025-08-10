import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';

interface PlatformAccount {
  id: string;
  platform: string;
  account_username?: string;
  account_email?: string;
  is_connected: boolean;
  oauth_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  last_sync_at?: string;
}

interface PlatformConnectionCardProps {
  platformId: string;
  onConnectionChange?: () => void;
  children?: React.ReactNode; // For platform-specific components like OAuth connection
  showPolicyManager?: boolean;
  PolicyManagerComponent?: React.ComponentType; // Platform-specific policy manager
}

const PlatformConnectionCard: React.FC<PlatformConnectionCardProps> = ({ 
  platformId, 
  onConnectionChange,
  children,
  showPolicyManager = false,
  PolicyManagerComponent
}) => {
  const [account, setAccount] = useState<PlatformAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const platform = platformRegistry.get(platformId);
  const platformName = platform?.name || platformId;
  const platformUrls: Record<string, string> = {
    ebay: 'https://www.ebay.com/mys/summary',
    poshmark: 'https://poshmark.com/closet',
    mercari: 'https://www.mercari.com/mypage/',
    depop: 'https://www.depop.com/user/'
  };

  useEffect(() => {
    loadPlatformAccount();
  }, [platformId]);

  const loadPlatformAccount = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platformId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setAccount(accounts?.[0] || null);
    } catch (error) {
      console.error(`Error loading ${platformName} account:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;

    try {
      const { error } = await supabase
        .from('marketplace_accounts')
        .update({ is_connected: false, is_active: false })
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: `${platformName} Disconnected`,
        description: `Your ${platformName} account has been disconnected successfully`
      });

      setAccount(null);
      onConnectionChange?.();
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const isTokenExpired = () => {
    if (!account?.token_expires_at) return false;
    return new Date(account.token_expires_at) < new Date();
  };

  const getConnectionStatus = () => {
    if (!account?.is_connected) return { status: 'disconnected', color: 'destructive' };
    if (isTokenExpired()) return { status: 'expired', color: 'destructive' };
    return { status: 'connected', color: 'default' };
  };

  const connectionStatus = getConnectionStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading {platformName} connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {account?.is_connected && !isTokenExpired() ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            {platformName} Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {account?.is_connected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Connected Account</h4>
                  <p className="text-sm text-gray-600">
                    {account.account_username || account.account_email || 'Connected'}
                  </p>
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
                    Your {platformName} connection has expired. Please reconnect to continue listing items.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
                {platformUrls[platformId] && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(platformUrls[platformId], '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on {platformName}
                  </Button>
                )}
              </div>
            </>
          ) : (
            // Render platform-specific connection component (e.g., OAuth flow)
            children || (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  Connect your {platformName} account to start listing items
                </p>
                <Button onClick={() => onConnectionChange?.()}>
                  Connect {platformName}
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Show platform-specific policy manager if connected and component provided */}
      {account?.is_connected && !isTokenExpired() && showPolicyManager && PolicyManagerComponent && (
        <PolicyManagerComponent />
      )}
    </div>
  );
};

export default PlatformConnectionCard;
