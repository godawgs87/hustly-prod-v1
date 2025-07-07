import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEbaySyncOperation } from '@/hooks/useEbaySyncOperation';
import type { Listing } from '@/types/Listing';
import ListingValidation from './ListingValidation';
import PlatformSetupNotifications from '@/components/notifications/PlatformSetupNotifications';

interface EbaySyncButtonProps {
  listing: Listing;
  onSyncComplete?: () => void;
}

const EbaySyncButton = ({ listing, onSyncComplete }: EbaySyncButtonProps) => {
  const [ebayListing, setEbayListing] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isValidForSync, setIsValidForSync] = useState(false);
  const { toast } = useToast();
  const { syncToEbay, isSyncing, showSetupNotification, setShowSetupNotification } = useEbaySyncOperation();

  useEffect(() => {
    checkEbayStatus();
    loadUserProfile();
  }, [listing.id]);

  const loadUserProfile = async () => {
    try {
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
      // Check if this listing is already synced to eBay
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

  const handleSync = async () => {
    const result = await syncToEbay(listing);
    
    if (result.success && result.data) {
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
            →
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={showValidation} onOpenChange={setShowValidation}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          className="text-xs h-7"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowValidation(true);
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
          <DialogTitle>Sync to eBay</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">"{listing.title}"</h4>
            <p className="text-sm text-blue-800">
              This will create a new listing on eBay with your connected account.
            </p>
          </div>
          
          <ListingValidation 
            listing={listing} 
            userProfile={userProfile}
            onValidationComplete={(isValid, errors) => {
              setIsValidForSync(isValid);
            }}
          />
          
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
              onClick={() => setShowValidation(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>
          </div>
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

export default EbaySyncButton;