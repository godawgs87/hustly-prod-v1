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

  const { data: connectionStatus } = useQuery({
    queryKey: ['ebay-connection-status', user?.id],
    queryFn: validateEbayConnection,
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  if (!connectionStatus) return null;

  // Calculate time until expiry
  const timeUntilExpiry = connectionStatus.timeUntilExpiry || 0;
  const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
  const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);

  // Show warning if token expires within 7 days or is already expired
  const shouldShowWarning = !connectionStatus.isTokenValid || 
    (timeUntilExpiry > 0 && daysUntilExpiry <= 7);

  if (showOnlyIfExpiringSoon && !shouldShowWarning) return null;

  const handleReconnect = () => {
    window.location.href = '/settings?tab=connections';
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
  } else if (daysUntilExpiry <= 1) {
    alertVariant = "destructive";
    message = `eBay connection expires in ${hoursUntilExpiry} hours. Reconnect now to avoid service interruption.`;
  } else if (daysUntilExpiry <= 3) {
    message = `eBay connection expires in ${daysUntilExpiry} days. Consider reconnecting soon.`;
  } else if (daysUntilExpiry <= 7) {
    message = `eBay connection expires in ${daysUntilExpiry} days.`;
  }

  return (
    <Alert variant={alertVariant} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        <Button
          variant={alertVariant === "destructive" ? "destructive" : "outline"}
          size="sm"
          onClick={handleReconnect}
          className="ml-4"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          {actionText}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default EbayTokenExpiryWarning;
