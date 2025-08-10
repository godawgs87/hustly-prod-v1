import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';
import type { Listing } from '@/types/Listing';
import type { BulkOperation, BulkResult } from '@/types/platform';

interface BulkPlatformSyncManagerProps {
  platformId: string;
  selectedListings: Listing[];
  onSyncComplete: () => void;
}

interface SyncResult {
  listingId: string;
  title: string;
  success: boolean;
  platformListingId?: string;
  platformUrl?: string;
  error?: string;
}

const BulkPlatformSyncManager = ({ platformId, selectedListings, onSyncComplete }: BulkPlatformSyncManagerProps) => {
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const adapter = platformRegistry.get(platformId);
  
  if (!adapter) {
    return null;
  }

  const handleBulkSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResults([]);
    
    try {
      // Prepare bulk operations
      const operations: BulkOperation[] = selectedListings.map(listing => ({
        type: 'sync',
        listingId: listing.id,
        listing: {
          id: listing.id,
          title: listing.title || '',
          description: listing.description || '',
          price: listing.price || 0,
          quantity: listing.quantity || 1,
          category: listing.category || '',
          condition: listing.condition || 'Good',
          photos: listing.photos || [],
          brand: listing.brand,
          size: listing.size,
          color: listing.color,
          material: listing.material
        }
      }));

      // Process each listing with progress updates
      const results: SyncResult[] = [];
      const totalItems = operations.length;
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const listing = selectedListings[i];
        
        setCurrentItem(listing.title || 'Untitled');
        setSyncProgress(Math.round((i / totalItems) * 100));
        
        try {
          // Sync individual listing
          if (operation.listingId) {
            const syncResult = await adapter.syncListing(operation.listingId);
            
            results.push({
              listingId: operation.listingId,
              title: listing.title || 'Untitled',
              success: true,
              platformListingId: operation.listingId,
              platformUrl: `https://www.${platformId}.com/item/${operation.listingId}`,
              error: undefined
            });
          }
        } catch (error) {
          results.push({
            listingId: operation.listingId || '',
            title: listing.title || 'Untitled',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // Add a small delay between requests to avoid rate limiting
        if (i < operations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      setSyncResults(results);
      setSyncProgress(100);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Bulk Sync Complete",
        description: `Successfully synced ${successCount} listings${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      toast({
        title: "Bulk Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline" 
          size="sm"
          disabled={selectedListings.length === 0}
          className="flex items-center gap-2"
        >
          <span>{adapter.icon}</span>
          Bulk Sync to {adapter.name} ({selectedListings.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Sync to {adapter.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This will sync {selectedListings.length} listing{selectedListings.length !== 1 ? 's' : ''} to {adapter.name}. 
              Each listing will be processed individually with a 2-second delay between requests.
            </AlertDescription>
          </Alert>

          {isSyncing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Processing: {currentItem}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(syncProgress)}%
                </span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          )}

          {syncResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Sync Results:</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {syncResults.map((result, index) => (
                  <div
                    key={`${result.listingId}-${index}`}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-2 flex-1">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{result.title}</p>
                        {result.success ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {result.platformListingId}
                            </Badge>
                            {result.platformUrl && (
                              <a
                                href={result.platformUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                              >
                                View on {adapter.name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">
                            {result.error || 'Sync failed'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!isSyncing && syncResults.length === 0 && (
              <Button onClick={handleBulkSync} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Start Sync
              </Button>
            )}
            {syncResults.length > 0 && (
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPlatformSyncManager;
