import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEbaySyncOperation } from '@/hooks/useEbaySyncOperation';
import { useEbayStore } from '@/stores/ebayStore';
import type { Listing } from '@/types/Listing';
import ListingValidation from './ListingValidation';
import PlatformSetupNotifications from '@/components/notifications/PlatformSetupNotifications';
import { testEbayShippingService, testAllShippingPreferences } from '@/utils/ebayShippingTest';
import { validateEbayConnection, cleanupExpiredEbayConnections } from '@/utils/ebayConnectionValidator';

interface EnhancedEbaySyncButtonProps {
  listing: Listing;
  onSyncComplete?: () => void;
}

interface SyncProgress {
  stage: 'validating' | 'connecting' | 'creating' | 'publishing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

const EnhancedEbaySyncButton = ({ listing, onSyncComplete }: EnhancedEbaySyncButtonProps) => {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [ebayListing, setEbayListing] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isValidForSync, setIsValidForSync] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const { account, setAccount, setError } = useEbayStore();
  const { syncToEbay, isSyncing, showSetupNotification, setShowSetupNotification } = useEbaySyncOperation();

  useEffect(() => {
    checkEbayStatus();
    loadUserProfile();
  }, [listing.id]);

  const loadUserProfile = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkEbayStatus = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // First check connection status and clean up expired connections
      await cleanupExpiredEbayConnections();
      const connectionStatus = await validateEbayConnection();
      
      console.log('🔍 eBay connection validation:', connectionStatus);
      
      if (!connectionStatus.isConnected || !connectionStatus.isTokenValid) {
        console.warn('⚠️ eBay connection issues detected:', connectionStatus.issues);
        if (connectionStatus.needsReconnection) {
          setShowSetupNotification(true);
        }
      }
      
      // Check if this listing is already synced
      const { data } = await supabase
        .from('platform_listings')
        .select(`*, marketplace_accounts!inner(platform)`)
        .eq('listing_id', listing.id)
        .eq('marketplace_accounts.platform', 'ebay')
        .maybeSingle();

      setEbayListing(data);
    } catch (error) {
      console.error('Error checking eBay status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const updateProgress = (stage: SyncProgress['stage'], progress: number, message: string, error?: string) => {
    setSyncProgress({ stage, progress, message, error });
  };

  const handleSync = async () => {
    setRetryCount(0);
    updateProgress('validating', 10, 'Validating listing and account...');
    
    // Pre-sync validation
    const connectionStatus = await validateEbayConnection();
    if (!connectionStatus.isConnected || !connectionStatus.isTokenValid) {
      updateProgress('error', 0, 'Connection validation failed', 
        `eBay connection issues: ${connectionStatus.issues.join(', ')}`);
      setShowSetupNotification(true);
      return;
    }
    
    updateProgress('connecting', 30, 'Connecting to eBay...');
    const result = await syncToEbay(listing);
    
    if (result.success && result.data) {
      updateProgress('complete', 100, 'Successfully published to eBay!');

      // Update local state
      const newEbayListing = {
        id: Date.now().toString(),
        platform_listing_id: result.data.platform_listing_id,
        platform_url: result.data.platform_url,
        status: 'active',
        listed_price: listing.price
      };
      
      setEbayListing(newEbayListing);

      if (onSyncComplete) {
        onSyncComplete();
      }

      setTimeout(() => {
        setShowDialog(false);
        setSyncProgress(null);
      }, 2000);
    } else {
      updateProgress('error', 0, 'Sync failed', result.error || 'Unknown error');
      setRetryCount(prev => prev + 1);
    }
  };

  const handleRetry = () => {
    setSyncProgress(null);
    handleSync();
  };

  // 🧪 DEBUG: Enhanced shipping service testing
  const handleShippingTest = async (preference = 'USPSPriority') => {
    console.log(`🧪 Testing eBay shipping service: ${preference}`);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // First refresh shipping services
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('ebay-shipping-services-fetcher', {
        body: { 
          userId: userProfile?.id,
          forceRefresh: true
        }
      });

      if (refreshError) {
        console.error('❌ Shipping service refresh failed:', refreshError);
        toast({
          title: "Refresh Failed",
          description: `Failed to refresh shipping services: ${refreshError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Shipping services refreshed:', refreshData);
      
      // Test the original service too
      const result = await testEbayShippingService(preference);
      
      toast({
        title: result.success ? "Shipping Test Complete" : "Shipping Test Failed",
        description: result.success 
          ? `"${preference}" → "${result.data?.exactServiceCodeToBeSent}" (${refreshData.services?.length || 0} total services available)` 
          : `${result.error?.message || "Test failed"} (${refreshData.services?.length || 0} services available)`,
        variant: result.success ? "default" : "destructive",
        duration: 5000
      });

    } catch (error) {
      console.error('❌ Shipping test exception:', error);
      toast({
        title: "Test Error",
        description: `Test failed: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleAllShippingTests = async () => {
    console.log('🧪 Testing all shipping preferences...');
    const services = ['USPSGround', 'USPSPriority', 'USPSPriorityFlatRateBox', 'USPSPriorityExpress'];
    
    for (const service of services) {
      await handleShippingTest(service);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Function to sync eBay Motors categories
  const handleMotorsCategorySync = async () => {
    console.log('🚗 Syncing eBay Motors categories');
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('ebay-motors-category-sync', {
        body: { 
          userId: userProfile?.id
        }
      });

      if (error) {
        console.error('❌ Motors category sync failed:', error);
        toast({
          title: "Sync Failed",
          description: `Failed to sync Motors categories: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('✅ Motors categories synced:', data);
        toast({
          title: "Sync Successful",
          description: `Successfully synced ${data.categoriesAdded} eBay Motors categories`,
        });
      }
    } catch (error) {
      console.error('❌ Motors sync exception:', error);
      toast({
        title: "Sync Error",
        description: `Sync failed: ${error}`,
        variant: "destructive",
      });
    }
  };

  if (checkingStatus) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="w-3 h-3" />
      </Button>
    );
  }

  // Show synced state if already on eBay
  if (ebayListing && ebayListing.status === 'active') {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          eBay
        </Badge>
        {ebayListing.platform_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(ebayListing.platform_url, '_blank')}
            className="h-6 w-6 p-0"
            title="View on eBay"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          className="text-xs h-7"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDialog(true);
          }}
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Syncing
            </>
          ) : (
            <>
              <span className="mr-1">↗</span>
              eBay
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sync to eBay
            {syncProgress?.stage === 'complete' && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {syncProgress?.stage === 'error' && (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">"{listing.title}"</h4>
            <p className="text-sm text-blue-800">
              This will create a new listing on eBay with your connected account.
            </p>
          </div>

          {/* Sync Progress */}
          {syncProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{syncProgress.message}</span>
                {syncProgress.stage !== 'error' && (
                  <span className="text-sm text-gray-500">{syncProgress.progress}%</span>
                )}
              </div>
              
              {syncProgress.stage !== 'error' ? (
                <Progress value={syncProgress.progress} className="w-full" />
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {syncProgress.error}
                    {retryCount > 0 && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry ({retryCount} attempt{retryCount !== 1 ? 's' : ''})
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {syncProgress.stage === 'complete' && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Your listing has been successfully published to eBay!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Validation Section - only show if not syncing */}
          {!syncProgress && (
            <>
              <ListingValidation 
                listing={listing} 
                userProfile={userProfile}
                onValidationComplete={(isValid, errors) => {
                  setIsValidForSync(isValid);
                }}
              />
              
              {/* 🧪 DEBUG: Phase 2A Shipping Service Testing - Development only */}
              {import.meta.env.DEV && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Phase 2A Debug: Shipping Service Testing
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Test the shipping service module in isolation to debug eBay error 25007.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShippingTest('usps_priority')}
                      className="text-xs"
                    >
                      Test USPS Priority
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShippingTest('usps_first_class')}
                      className="text-xs"
                    >
                      Test First Class
                    </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleAllShippingTests}
                       className="text-xs bg-yellow-100"
                     >
                       Test All Services
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleMotorsCategorySync}
                       className="text-xs bg-blue-100"
                     >
                       🚗 Sync Motors Categories
                     </Button>
                   </div>
                   <p className="text-xs text-yellow-700 mt-2">
                     User preference: <code>{userProfile?.preferred_shipping_service || 'usps_priority'}</code>
                   </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSync}
                  disabled={!isValidForSync || isSyncing}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing to eBay...
                    </>
                  ) : (
                    'Sync to eBay'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={isSyncing}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
      
      <PlatformSetupNotifications
        isVisible={showSetupNotification}
        onDismiss={() => setShowSetupNotification(false)}
        onRemindLater={() => setShowSetupNotification(false)}
        triggerContext="listing_sync"
        platformAttempted="ebay"
      />
    </Dialog>
  );
};

export default EnhancedEbaySyncButton;