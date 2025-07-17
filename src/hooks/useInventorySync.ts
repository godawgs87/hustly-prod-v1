import { useState, useEffect, useCallback } from 'react';
import { InventorySyncService, type InventorySyncStatus } from '@/services/InventorySyncService';
import { useToast } from '@/hooks/use-toast';

export interface UseInventorySyncReturn {
  syncStatuses: Map<string, InventorySyncStatus[]>;
  isLoading: boolean;
  error: string | null;
  syncListing: (listingId: string) => Promise<void>;
  getSyncStatus: (listingId: string) => InventorySyncStatus[];
  handleConflict: (listingId: string, platforms: string[]) => Promise<void>;
}

export function useInventorySync(): UseInventorySyncReturn {
  const [syncStatuses, setSyncStatuses] = useState<Map<string, InventorySyncStatus[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = InventorySyncService.subscribeToInventoryUpdates((update) => {
      setSyncStatuses(prev => {
        const newMap = new Map(prev);
        const existingStatuses = newMap.get(update.listingId) || [];
        const updatedStatuses = existingStatuses.map(status => 
          status.platform === update.platform ? { ...status, ...update } : status
        );
        
        // If platform not found, add it
        if (!updatedStatuses.find(s => s.platform === update.platform)) {
          updatedStatuses.push(update);
        }
        
        newMap.set(update.listingId, updatedStatuses);
        return newMap;
      });

      // Show toast for important updates
      if (update.status === 'conflict') {
        toast({
          title: 'Sync Conflict Detected',
          description: `Inventory conflict on ${update.platform}. Manual review required.`,
          variant: 'destructive'
        });
      } else if (update.status === 'error') {
        toast({
          title: 'Sync Error',
          description: `Failed to sync to ${update.platform}`,
          variant: 'destructive'
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  const syncListing = useCallback(async (listingId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const statuses = await InventorySyncService.syncListingAcrossPlatforms(listingId);
      
      setSyncStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(listingId, statuses);
        return newMap;
      });

      // Check for conflicts
      const hasConflicts = statuses.some(s => s.status === 'conflict');
      const hasErrors = statuses.some(s => s.status === 'error');

      if (hasConflicts) {
        toast({
          title: 'Sync Conflicts Detected',
          description: 'Some platforms have conflicts that need manual resolution.',
          variant: 'destructive'
        });
      } else if (hasErrors) {
        toast({
          title: 'Sync Errors',
          description: 'Failed to sync to some platforms. Please check your connections.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync Successful',
          description: `Synced to ${statuses.length} platforms successfully.`
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sync listing';
      setError(errorMessage);
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getSyncStatus = useCallback((listingId: string): InventorySyncStatus[] => {
    return syncStatuses.get(listingId) || [];
  }, [syncStatuses]);

  const handleConflict = useCallback(async (listingId: string, platforms: string[]) => {
    try {
      setIsLoading(true);
      await InventorySyncService.handleSimultaneousSale(listingId, platforms);
      
      // Refresh sync status
      const updatedStatuses = await InventorySyncService.getSyncStatus(listingId);
      setSyncStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(listingId, updatedStatuses);
        return newMap;
      });

      toast({
        title: 'Conflict Resolved',
        description: 'Simultaneous sale conflict has been automatically resolved.',
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to resolve conflict';
      setError(errorMessage);
      toast({
        title: 'Conflict Resolution Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    syncStatuses,
    isLoading,
    error,
    syncListing,
    getSyncStatus,
    handleConflict
  };
}