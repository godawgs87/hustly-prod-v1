import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';
import { supabase } from '@/integrations/supabase/client';

interface PlatformTokenExpiryWarningProps {
  platformId: string;
  showOnlyIfExpiringSoon?: boolean;
  className?: string;
}

export const PlatformTokenExpiryWarning: React.FC<PlatformTokenExpiryWarningProps> = ({
  platformId,
  showOnlyIfExpiringSoon = true,
  className = ""
}) => {
  const { user } = useAuth();
  const adapter = platformRegistry.get(platformId);

  const { data: connectionStatus, refetch } = useQuery({
    queryKey: ['platform-connection-status', platformId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get the marketplace account for this platform
      const { data: account } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('marketplace', platformId)
        .single();

      if (!account) {
        return {
          isConnected: false,
          isTokenValid: false,
          timeUntilExpiry: 0
        };
      }

      // Check if token is expired
      const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
      const now = new Date();
      const isTokenValid = tokenExpiresAt ? tokenExpiresAt > now : true;
      const timeUntilExpiry = tokenExpiresAt ? tokenExpiresAt.getTime() - now.getTime() : Infinity;

      // Validate connection with the adapter
      let isConnected = false;
      try {
        if (adapter) {
          await adapter.connect({
            accessToken: account.oauth_token,
            refreshToken: account.refresh_token,
            expiresAt: account.token_expires_at
          });
          isConnected = await adapter.validateConnection();
        }
      } catch (error) {
        console.error(`Failed to validate ${platformId} connection:`, error);
      }

      return {
        isConnected,
        isTokenValid,
        timeUntilExpiry
      };
    },
    enabled: !!user && !!adapter,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  if (!connectionStatus || !adapter) return null;

  // Calculate time until expiry
  const timeUntilExpiry = connectionStatus.timeUntilExpiry || 0;
  const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
  const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);

  // Only show warning if token expires within 7 days, is already expired, or not connected
  const shouldShowWarning = !connectionStatus.isConnected || 
    !connectionStatus.isTokenValid || 
    (timeUntilExpiry > 0 && timeUntilExpiry < Infinity && timeUntilExpiry <= 7 * 24 * 60 * 60 * 1000);

  if (showOnlyIfExpiringSoon && !shouldShowWarning) return null;

  const handleReconnect = async () => {
    // Refresh the connection status first
    await refetch();
    // Navigate to settings page
    setTimeout(() => {
      window.location.href = '/settings?tab=connections';
    }, 500);
  };

  // Different messages based on expiry status
  let alertVariant: "default" | "destructive" = "default";
  let message = "";
  let actionText = `Reconnect ${adapter.name}`;

  if (!connectionStatus.isConnected) {
    alertVariant = "destructive";
    message = `${adapter.name} account not connected. Connect your ${adapter.name} account to enable price research and listing sync.`;
    actionText = `Connect ${adapter.name}`;
  } else if (!connectionStatus.isTokenValid) {
    alertVariant = "destructive";
    message = `${adapter.name} connection expired. Reconnect your ${adapter.name} account to restore price research and listing sync.`;
  } else if (daysUntilExpiry <= 7 && timeUntilExpiry < Infinity) {
    alertVariant = daysUntilExpiry <= 1 ? "destructive" : "default";
    if (daysUntilExpiry <= 1) {
      message = `${adapter.name} connection expires in ${hoursUntilExpiry} hours. Reconnect now to avoid service interruption.`;
    } else {
      message = `${adapter.name} connection expires in ${daysUntilExpiry} days. Consider reconnecting soon.`;
    }
  }

  const handleRefreshStatus = async () => {
    await refetch();
  };

  return (
    <Alert variant={alertVariant} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshStatus}
            title="Refresh connection status"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant={alertVariant === "destructive" ? "destructive" : "outline"}
            size="sm"
            onClick={handleReconnect}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {actionText}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default PlatformTokenExpiryWarning;
