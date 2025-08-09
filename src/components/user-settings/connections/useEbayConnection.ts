import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEbayStore } from '@/stores/ebayStore';
import { useQueryClient } from '@tanstack/react-query';

const OAUTH_PROCESSING_KEY = 'ebay_oauth_processing';
const OAUTH_HANDLED_KEY = 'ebay_oauth_handled';

export const useEbayConnection = () => {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const checkEbayConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: accounts, error } = await supabase
          .from('marketplace_accounts')
          .select('*')
          .eq('platform', 'ebay')
          .eq('user_id', session.user.id)
          .eq('is_connected', true)
          .eq('is_active', true);

        if (error) {
          console.error('Error checking eBay connection:', error);
          return false;
        }

        console.log('🔍 eBay accounts found:', accounts);
        
        const hasRealConnection = accounts && accounts.length > 0 && 
          accounts.some(acc => 
            acc.oauth_token && 
            acc.is_connected === true &&
            acc.is_active === true &&
            !acc.oauth_token.startsWith('mock_')
          );

        return hasRealConnection;
      }
      return false;
    } catch (error) {
      console.error('Error checking eBay connection:', error);
      return false;
    }
  };

  const handlePendingOAuth = async () => {
    const pendingOAuth = localStorage.getItem('ebay_oauth_pending');
    if (!pendingOAuth) return false;

    // If we've already handled a recent OAuth completion, do not process again
    if (localStorage.getItem(OAUTH_HANDLED_KEY) === 'true') {
      localStorage.removeItem('ebay_oauth_pending');
      return false;
    }

    // Prevent duplicate parallel processing across components/mounts
    if (sessionStorage.getItem(OAUTH_PROCESSING_KEY) === '1') {
      return false;
    }

    try {
      const { code, state } = JSON.parse(pendingOAuth);
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Mark processing to avoid concurrent exchanges
        sessionStorage.setItem(OAUTH_PROCESSING_KEY, '1');

        // Use supabase.functions.invoke for consistency
        const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
          body: {
            action: 'exchange_code',
            code: code,
            state: state,
            origin: window.location.origin
          },
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (error) {
          throw new Error(`Function error: ${error.message}`);
        }

        if (data.success) {
          localStorage.removeItem('ebay_oauth_pending');
          localStorage.setItem(OAUTH_HANDLED_KEY, 'true');

          // Update eBay store with connection status
          const { setAccount } = useEbayStore.getState();
          setAccount({
            id: data.username || 'ebay_user',
            username: data.username || 'eBay User',
            isConnected: true,
            oauthToken: 'connected' // We don't store the actual token in the frontend
          });

          // Invalidate connection status queries for this user so UI updates immediately
          queryClient.invalidateQueries({ queryKey: ['ebay-connection-status', session.user.id] });

          toast({
            title: "eBay Connected Successfully",
            description: `Your eBay account (${data.username}) is now connected and ready to use`
          });

          return true;
        }
      }
    } catch (error: any) {
      console.error('Failed to complete pending eBay OAuth:', error);
      // If token exchange fails (e.g., duplicate processing), verify connection state
      try {
        const { data: { session: sessionAfter } } = await supabase.auth.getSession();
        const isConnected = await checkEbayConnection();
        if (isConnected) {
          localStorage.removeItem('ebay_oauth_pending');
          localStorage.setItem(OAUTH_HANDLED_KEY, 'true');
          if (sessionAfter?.user?.id) {
            queryClient.invalidateQueries({ queryKey: ['ebay-connection-status', sessionAfter.user.id] });
          }
          toast({
            title: "eBay Connection Confirmed",
            description: "Your eBay account is connected.",
          });
          return true;
        }
      } catch (verifyErr) {
        console.warn('OAuth verification step failed:', verifyErr);
      }

      localStorage.removeItem('ebay_oauth_pending');
      toast({
        title: "Connection Failed",
        description: "Failed to complete eBay connection. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Always clear processing lock
      sessionStorage.removeItem(OAUTH_PROCESSING_KEY);
    }

    return false;
  };

  const connectEbay = async () => {
    try {
      console.log('🚀 Initiating eBay OAuth flow...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }
      
      console.log('✅ User session verified, calling edge function...');
      // Clear any prior handled flag to allow a fresh OAuth completion
      localStorage.removeItem(OAUTH_HANDLED_KEY);
      
      // Use supabase.functions.invoke for consistency
      const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
        body: {
          action: 'get_auth_url',
          state: crypto.randomUUID(),
          origin: window.location.origin
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('📡 Edge function response:', { data, error });

      if (error) {
        console.log('❌ Edge function error:', error);
        throw new Error(`OAuth setup failed: ${error.message}`);
      }

      if (!data?.auth_url) {
        throw new Error('No authorization URL received from server');
      }

      console.log('🔗 Redirecting to eBay OAuth URL');
      window.location.href = data.auth_url;
    } catch (error: any) {
      console.error('eBay OAuth initiation failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to initiate eBay connection. Please check your eBay app configuration.',
        variant: "destructive"
      });
    }
  };

  const disconnectEbay = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase
          .from('marketplace_accounts')
          .delete()
          .eq('platform', 'ebay')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error disconnecting eBay:', error);
          throw error;
        }

        // Invalidate connection status queries for this user so UI updates immediately
        queryClient.invalidateQueries({ queryKey: ['ebay-connection-status', session.user.id] });
      }
      
      toast({
        title: "eBay Disconnected",
        description: "Your eBay account has been disconnected"
      });
      
      return true;
    } catch (error) {
      console.error('Failed to disconnect eBay:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect eBay account",
        variant: "destructive"
      });
      return false;
    }
  };

  const refreshConnectionStatus = async () => {
    setRefreshing(true);
    try {
      const hasConnection = await checkEbayConnection();
      
      toast({
        title: "Status Refreshed",
        description: hasConnection ? "eBay connection verified" : "No active eBay connection found"
      });
      
      return hasConnection;
    } catch (error) {
      console.error('Error refreshing connection status:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh connection status",
        variant: "destructive"
      });
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  return {
    checkEbayConnection,
    handlePendingOAuth,
    connectEbay,
    disconnectEbay,
    refreshConnectionStatus,
    refreshing
  };
};