import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EbayService } from '@/services/api/ebayService';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

interface ExtendedListing extends Listing {
  ebay_item_id?: string;
}

interface EbaySyncIntegrationProps {
  selectedListings?: ExtendedListing[];
  onSyncComplete: () => void;
  className?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface SyncStatus {
  listingId: string;
  title: string;
  ebayItemId?: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  message?: string;
}

const EbaySyncIntegration = ({ 
  selectedListings = [], 
  onSyncComplete,
  className = ''
}: EbaySyncIntegrationProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [ebayConnected, setEbayConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('import');
  const { toast } = useToast();

  // Check eBay connection status
  useEffect(() => {
    checkEbayConnection();
  }, []);

  const checkEbayConnection = async () => {
    try {
      const { data: account } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .maybeSingle();
      
      setEbayConnected(!!account);
    } catch (error) {
      console.error('Error checking eBay connection:', error);
    }
  };

  const handleImportFromEbay = async () => {
    if (!ebayConnected) {
      toast({
        title: "eBay Not Connected",
        description: "Please connect your eBay account in Settings first",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      // Step 1: Fetch listings from eBay (30% progress)
      setImportProgress(10);
      const response = await EbayService.importInventory();
      setImportProgress(30);

      // Extract listings from the response object
      const ebayListings = response?.listings || [];
      
      if (!ebayListings || ebayListings.length === 0) {
        setImportResult({
          success: false,
          imported: 0,
          updated: 0,
          failed: 0,
          errors: ['No active listings found on eBay']
        });
        return;
      }

      // Step 2: Import to Hustly database (70% progress)
      setImportProgress(50);
      const result = await EbayService.importToHustly(ebayListings);
      setImportProgress(90);

      // Step 3: Complete and show results
      setImportProgress(100);
      setImportResult({
        success: true,
        imported: result.imported || 0,
        updated: result.updated || 0,
        failed: result.failed || 0,
        errors: result.errors || []
      });

      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} new, updated ${result.updated} existing listings`,
        variant: "default"
      });

      // Refresh the inventory view
      setTimeout(() => {
        onSyncComplete();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        imported: 0,
        updated: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Import failed']
      });
      
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import eBay listings",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSyncSelected = async () => {
    if (selectedListings.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to sync with eBay",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatuses([]);

    const statuses: SyncStatus[] = selectedListings.map(listing => ({
      listingId: listing.id,
      title: listing.title || 'Untitled',
      ebayItemId: listing.ebay_item_id,
      status: 'pending'
    }));
    setSyncStatuses(statuses);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedListings.length; i++) {
      const listing = selectedListings[i];
      const progress = Math.round(((i + 1) / selectedListings.length) * 100);
      setSyncProgress(progress);

      // Update status to syncing
      setSyncStatuses(prev => prev.map(s => 
        s.listingId === listing.id 
          ? { ...s, status: 'syncing' }
          : s
      ));

      try {
        if (listing.ebay_item_id) {
          // Update existing eBay listing
          await EbayService.updateListing(listing.ebay_item_id, {
            title: listing.title,
            description: listing.description,
            price: listing.price,
            quantity: listing.quantity || 1
          });

          setSyncStatuses(prev => prev.map(s => 
            s.listingId === listing.id 
              ? { ...s, status: 'success', message: 'Updated on eBay' }
              : s
          ));
          successCount++;
        } else {
          // Create new eBay listing
          try {
            console.log('📤 Creating new eBay listing for:', listing.title);
            
            // Use the syncListing method which handles the full creation flow
            const result = await EbayService.syncListing(listing.id, { dryRun: false });
            
            if (result.success) {
              setSyncStatuses(prev => prev.map(s => 
                s.listingId === listing.id 
                  ? { ...s, status: 'success', message: `Created on eBay: ${result.itemId}`, ebayItemId: result.itemId }
                  : s
              ));
              successCount++;
              
              // Update the listing with the new eBay item ID
              if (result.itemId) {
                await supabase
                  .from('listings')
                  .update({ ebay_item_id: result.itemId })
                  .eq('id', listing.id);
              }
            } else {
              throw new Error(result.error || 'Failed to create eBay listing');
            }
          } catch (createError) {
            console.error('Failed to create eBay listing:', createError);
            setSyncStatuses(prev => prev.map(s => 
              s.listingId === listing.id 
                ? { ...s, status: 'error', message: createError instanceof Error ? createError.message : 'Failed to create listing' }
                : s
            ));
            failCount++;
          }
        }
      } catch (error) {
        setSyncStatuses(prev => prev.map(s => 
          s.listingId === listing.id 
            ? { ...s, status: 'error', message: error instanceof Error ? error.message : 'Sync failed' }
            : s
        ));
        failCount++;
      }

      // Small delay between operations
      if (i < selectedListings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsSyncing(false);

    toast({
      title: "Sync Complete",
      description: `${successCount} items synced, ${failCount} failed`,
      variant: successCount > 0 ? "default" : "destructive"
    });

    if (successCount > 0) {
      setTimeout(() => {
        onSyncComplete();
        setShowDialog(false);
      }, 2000);
    }
  };

  const handleCheckStatus = async () => {
    if (selectedListings.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to check eBay status",
        variant: "destructive"
      });
      return;
    }

    const ebayListings = selectedListings.filter(l => l.ebay_item_id);
    if (ebayListings.length === 0) {
      toast({
        title: "No eBay Items",
        description: "Selected items are not listed on eBay",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const itemIds = ebayListings.map(l => l.ebay_item_id).filter(Boolean) as string[];
      const results = await EbayService.bulkStatusCheck(itemIds);
      
      toast({
        title: "Status Check Complete",
        description: `Checked ${results.length} items on eBay`,
        variant: "default"
      });

      onSyncComplete();
    } catch (error) {
      toast({
        title: "Status Check Failed",
        description: error instanceof Error ? error.message : "Failed to check eBay status",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className={`flex items-center gap-2 ${className}`}
      >
        <ShoppingBag className="w-4 h-4" />
        eBay Sync
        {selectedListings.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {selectedListings.length}
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>eBay Inventory Management</DialogTitle>
            <DialogDescription>
              Import listings from eBay or sync selected items
            </DialogDescription>
          </DialogHeader>

          {!ebayConnected ? (
            <Alert className="my-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                eBay account not connected. Please connect your eBay account in Settings to use sync features.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="import">Import</TabsTrigger>
                <TabsTrigger value="sync">Sync</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4">
                <div className="space-y-4">
                  <Alert>
                    <Package className="w-4 h-4" />
                    <AlertDescription>
                      Import all your active eBay listings into Hustly. This will create new items or update existing ones based on eBay Item ID.
                    </AlertDescription>
                  </Alert>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Importing from eBay...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  {importResult && (
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {importResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-medium">
                          {importResult.success ? 'Import Successful' : 'Import Failed'}
                        </span>
                      </div>
                      
                      {importResult.success && (
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {importResult.imported}
                            </div>
                            <div className="text-sm text-muted-foreground">New Items</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {importResult.updated}
                            </div>
                            <div className="text-sm text-muted-foreground">Updated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {importResult.failed}
                            </div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                          </div>
                        </div>
                      )}

                      {importResult.errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                          {importResult.errors.map((error, i) => (
                            <div key={i}>{error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={handleImportFromEbay}
                    disabled={isImporting}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Import from eBay
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="sync" className="space-y-4">
                <Alert>
                  <Upload className="w-4 h-4" />
                  <AlertDescription>
                    Sync selected Hustly items with their eBay listings. This will update prices, quantities, and descriptions on eBay.
                  </AlertDescription>
                </Alert>

                {selectedListings.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No items selected. Please close this dialog and select items from your inventory to sync.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {selectedListings.length} item{selectedListings.length !== 1 ? 's' : ''} selected for sync
                    </div>

                    {isSyncing && (
                      <div className="space-y-2">
                        <Progress value={syncProgress} />
                        <div className="text-sm text-center">{syncProgress}% complete</div>
                      </div>
                    )}

                    {syncStatuses.length > 0 && (
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {syncStatuses.map(status => (
                          <div key={status.listingId} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2 flex-1">
                              {status.status === 'pending' && <Package className="w-4 h-4 text-gray-400" />}
                              {status.status === 'syncing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                              {status.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {status.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              <span className="text-sm truncate flex-1">{status.title}</span>
                            </div>
                            {status.message && (
                              <span className="text-xs text-muted-foreground">{status.message}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      onClick={handleSyncSelected}
                      disabled={isSyncing}
                      className="w-full"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Sync to eBay
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <Alert>
                  <RefreshCw className="w-4 h-4" />
                  <AlertDescription>
                    Check the current status of selected items on eBay. This will update their listing status and sync any changes.
                  </AlertDescription>
                </Alert>

                {selectedListings.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No items selected. Please close this dialog and select items to check their eBay status.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Check status for {selectedListings.length} selected item{selectedListings.length !== 1 ? 's' : ''}
                    </div>

                    <Button 
                      onClick={handleCheckStatus}
                      disabled={isSyncing}
                      className="w-full"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Check eBay Status
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EbaySyncIntegration;
