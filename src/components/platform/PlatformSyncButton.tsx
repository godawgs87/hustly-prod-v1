import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';
import { SyncResult } from '@/types/platform';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlatformSyncButtonProps {
  platformId: string;
  listingId: string;
  onSync?: (result: SyncResult) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const PlatformSyncButton: React.FC<PlatformSyncButtonProps> = ({
  platformId,
  listingId,
  onSync,
  className,
  variant = 'outline',
  size = 'sm',
  showLabel = true
}) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();
  
  const platform = platformRegistry.get(platformId);
  
  // Don't render if platform doesn't exist or doesn't support sync
  if (!platform?.capabilities.inventorySync) {
    return null;
  }
  
  const handleSync = async () => {
    if (!platform || syncing) return;
    
    setSyncing(true);
    try {
      // Check if platform is connected
      const isConnected = await platform.validateConnection();
      if (!isConnected) {
        toast({
          title: `${platform.name} Not Connected`,
          description: `Please connect your ${platform.name} account first`,
          variant: 'destructive'
        });
        return;
      }
      
      // Perform sync
      const result = await platform.syncListing(listingId);
      setLastSyncResult(result);
      
      if (result.status === 'error') {
        toast({
          title: 'Sync Failed',
          description: result.errors?.join(', ') || 'Unknown error occurred',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync Successful',
          description: `${platform.name} listing updated successfully`,
        });
        
        // Call the onSync callback if provided
        onSync?.(result);
      }
    } catch (error: any) {
      console.error(`Sync to ${platform.name} failed:`, error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync listing',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };
  
  const getButtonContent = () => {
    if (size === 'icon') {
      return (
        <>
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-lg">{platform.icon}</span>
          )}
        </>
      );
    }
    
    return (
      <>
        {syncing ? (
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <span className="mr-2">{platform.icon}</span>
        )}
        {showLabel && (
          <span>
            {syncing ? 'Syncing...' : `Sync to ${platform.name}`}
          </span>
        )}
      </>
    );
  };
  
  const getTooltip = () => {
    if (lastSyncResult) {
      return `Last sync: ${new Date(lastSyncResult.lastUpdated).toLocaleString()}`;
    }
    return `Sync listing to ${platform.name}`;
  };
  
  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={variant}
      size={size}
      className={cn(
        'transition-all',
        syncing && 'opacity-70',
        className
      )}
      title={getTooltip()}
    >
      {getButtonContent()}
      {lastSyncResult?.status === 'error' && !syncing && (
        <AlertCircle className="h-3 w-3 ml-1 text-destructive" />
      )}
    </Button>
  );
};
