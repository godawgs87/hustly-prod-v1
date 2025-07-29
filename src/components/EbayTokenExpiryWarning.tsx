import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { validateEbayConnection } from '@/utils/ebayConnectionValidator';
import { useAuth } from '@/components/AuthProvider';

interface EbayTokenExpiryWarningProps {
  showOnlyIfExpiringSoon?: boolean;
  className?: string;
}

export const EbayTokenExpiryWarning: React.FC<EbayTokenExpiryWarningProps> = ({
  showOnlyIfExpiringSoon = true,
  className = ""
}) => {
  const { user } = useAuth();

  const { data: connectionStatus, refetch } = useQuery({
    queryKey: ['ebay-connection-status', user?.id],
    queryFn: validateEbayConnection,
    enabled: !!user,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes (less frequent)
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  if (!connectionStatus) return null;

  // Calculate time until expiry
  const timeUntilExpiry = connectionStatus.timeUntilExpiry || 0;
  const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
  const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);

  // Only show warning if token expires within 7 days, is already expired, or not connected
  // Don't show warning for tokens that expire in months (normal eBay token duration)
  const shouldShowWarning = !connectionStatus.isConnected || 
    !connectionStatus.isTokenValid || 
    (timeUntilExpiry > 0 && timeUntilExpiry <= 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds

  if (showOnlyIfExpiringSoon && !shouldShowWarning) return null;

  const handleReconnect = async () => {
    // Refresh the connection status first to get latest data
    await refetch();
    // Small delay to allow for any async updates
    setTimeout(() => {
      window.location.href = '/settings?tab=connections';
    }, 500);
  };

  // Different messages based on expiry status
  let alertVariant: "default" | "destructive" = "default";
  let message = "";
  let actionText = "Reconnect eBay";

  if (!connectionStatus.isConnected) {
    alertVariant = "destructive";
    message = "eBay account not connected. Connect your eBay account to enable price research and listing sync.";
    actionText = "Connect eBay";
  } else if (!connectionStatus.isTokenValid) {
    alertVariant = "destructive";
    message = "eBay connection expired. Reconnect your eBay account to restore price research and listing sync.";
  } else if (daysUntilExpiry <= 7) {
    alertVariant = daysUntilExpiry <= 1 ? "destructive" : "default";
    if (daysUntilExpiry <= 1) {
      message = `eBay connection expires in ${hoursUntilExpiry} hours. Reconnect now to avoid service interruption.`;
    } else {
      message = `eBay connection expires in ${daysUntilExpiry} days. Consider reconnecting soon.`;
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

export default EbayTokenExpiryWarning;
