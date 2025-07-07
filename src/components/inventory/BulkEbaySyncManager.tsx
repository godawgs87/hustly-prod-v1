import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEbaySyncOperation } from '@/hooks/useEbaySyncOperation';
import type { Listing } from '@/types/Listing';

interface BulkEbaySyncManagerProps {
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

const BulkEbaySyncManager = ({ selectedListings, onSyncComplete }: BulkEbaySyncManagerProps) => {
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const { bulkSyncToEbay, isSyncing } = useEbaySyncOperation();

  const handleBulkSync = async () => {
    setSyncProgress(0);
    setSyncResults([]);
    
    const result = await bulkSyncToEbay(selectedListings);
    
    if (result.success && result.results) {
      // Convert results to our format
      const formattedResults: SyncResult[] = result.results.map((r: any) => ({
        listingId: r.listingId,
        title: selectedListings.find(l => l.id === r.listingId)?.title || 'Untitled',
        success: r.success,
        platformListingId: r.success ? r.data?.platform_listing_id : undefined,
        platformUrl: r.success ? r.data?.platform_url : undefined,
        error: r.success ? undefined : r.error
      }));
      
      setSyncResults(formattedResults);
      setSyncProgress(100);

      if (onSyncComplete) {
        onSyncComplete();
      }
    } else {
      toast({
        title: "Bulk Sync Failed",
        description: result.error || "Unknown error occurred",
        variant: "destructive"
      });
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
          <span>↗</span>
          Bulk Sync to eBay ({selectedListings.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Sync to eBay</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This will sync {selectedListings.length} listing{selectedListings.length !== 1 ? 's' : ''} to eBay. 
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
                  {syncProgress}%
                </span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          )}

          {syncResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="font-medium">Sync Results:</h4>
              {syncResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm p-2 border rounded">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{result.title}</span>
                  {result.success && result.platformUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(result.platformUrl, '_blank')}
                      title="View on eBay"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  {!result.success && (
                    <span className="text-xs text-red-600 truncate max-w-40" title={result.error}>
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBulkSync}
              disabled={isSyncing || selectedListings.length === 0}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing... ({syncProgress}%)
                </>
              ) : (
                `Start Bulk Sync (${selectedListings.length} items)`
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSyncing}
            >
              {isSyncing ? 'Close when done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEbaySyncManager;