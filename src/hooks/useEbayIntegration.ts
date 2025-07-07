import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EbayAccount {
  platform: string;
  username: string;
  connected: boolean;
}

interface PublishResult {
  status: string;
  platform_listing_id: string;
  platform_url: string;
  fees: any;
}

export const useEbayIntegration = () => {
  const [connecting, setConnecting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const connectEbayAccount = useCallback(async (username: string, oauthToken: string): Promise<EbayAccount | null> => {
    try {
      setConnecting(true);
      
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: { 
          action: 'connect_account',
          username,
          oauth_token: oauthToken
        }
      });

      if (error) throw error;

      toast({
        title: "eBay Account Connected",
        description: `Successfully connected eBay account: ${username}`
      });

      return data.account;
    } catch (error: any) {
      console.error('eBay connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect eBay account',
        variant: "destructive"
      });
      return null;
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  const importSoldListings = useCallback(async (count: number = 10): Promise<boolean> => {
    try {
      setImporting(true);
      
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: { 
          action: 'import_sold_listings',
          count
        }
      });

      if (error) throw error;

      toast({
        title: "Listings Imported",
        description: `Successfully imported ${data.imported_count} sold listings for AI training.`
      });

      return true;
    } catch (error: any) {
      console.error('Listing import failed:', error);
      toast({
        title: "Import Failed",
        description: error.message || 'Failed to import sold listings',
        variant: "destructive"
      });
      return false;
    } finally {
      setImporting(false);
    }
  }, [toast]);

  const publishListing = useCallback(async (listingId: string): Promise<PublishResult | null> => {
    try {
      setPublishing(true);
      
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: { 
          action: 'publish_listing',
          listingId
        }
      });

      if (error) throw error;

      toast({
        title: "Listing Published",
        description: `Successfully published to eBay: ${data.platform_listing_id}`
      });

      return data;
    } catch (error: any) {
      console.error('Listing publish failed:', error);
      toast({
        title: "Publish Failed",
        description: error.message || 'Failed to publish listing to eBay',
        variant: "destructive"
      });
      return null;
    } finally {
      setPublishing(false);
    }
  }, [toast]);

  const syncListingStatus = useCallback(async (): Promise<boolean> => {
    try {
      setSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: { action: 'sync_listing_status' }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced_count} listings from eBay.`
      });

      return true;
    } catch (error: any) {
      console.error('Listing sync failed:', error);
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync listing status',
        variant: "destructive"
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  return {
    connectEbayAccount,
    importSoldListings,
    publishListing,
    syncListingStatus,
    connecting,
    importing,
    publishing,
    syncing
  };
};