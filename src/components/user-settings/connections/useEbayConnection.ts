import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useEbayConnection = () => {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

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
    if (pendingOAuth) {
      try {
        const { code, state } = JSON.parse(pendingOAuth);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const response = await fetch(`https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/ebay-oauth`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremFhcHR4ZndpeGdtYnJvb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODI2NzksImV4cCI6MjA2NjI1ODY3OX0.C5ivIgxoapGcsGpZJo_hOF9XUzRuXeVgyCbmawDeCes'
            },
            body: JSON.stringify({
              action: 'exchange_code',
              code: code,
              state: state
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Function error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          if (data.success) {
            localStorage.removeItem('ebay_oauth_pending');
            
            toast({
              title: "eBay Connected Successfully",
              description: `Your eBay account (${data.username}) is now connected and ready to use`
            });
            
            return true;
          }
        }
      } catch (error: any) {
        console.error('Failed to complete pending eBay OAuth:', error);
        localStorage.removeItem('ebay_oauth_pending');
        toast({
          title: "Connection Failed",
          description: "Failed to complete eBay connection. Please try again.",
          variant: "destructive"
        });
      }
    }
    return false;
  };

  const connectEbay = async () => {
    try {
      console.log('Starting eBay connection process...');
      
      // Test the function first - FIXED: Use direct fetch
      const testResponse = await fetch(`https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremFhcHR4ZndpeGdtYnJvb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODI2NzksImV4cCI6MjA2NjI1ODY3OX0.C5ivIgxoapGcsGpZJo_hOF9XUzRuXeVgyCbmawDeCes'
        },
        body: JSON.stringify({ action: 'test' })
      });
      
      if (!testResponse.ok) {
        console.error('Function test failed:', testResponse.status);
        toast({
          title: "Function Error", 
          description: "Edge function is not responding properly",
          variant: "destructive"
        });
        return;
      }
      
      const testData = await testResponse.json();
      
      console.log('Function test successful:', testData);
      
      // Let's also test the debug endpoint - FIXED: Use direct fetch
      const debugResponse = await fetch(`https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremFhcHR4ZndpeGdtYnJvb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODI2NzksImV4cCI6MjA2NjI1ODY3OX0.C5ivIgxoapGcsGpZJo_hOF9XUzRuXeVgyCbmawDeCes'
        },
        body: JSON.stringify({ action: 'debug' })
      });

      if (!debugResponse.ok) {
        const errorText = await debugResponse.text();
        console.error('Debug check failed:', errorText);
        toast({
          title: "Configuration Error",
          description: `Failed to check eBay configuration: ${errorText}`,
          variant: "destructive"
        });
        return;
      }

      const debugData = await debugResponse.json();

      console.log('eBay configuration status:', debugData);

      if (debugData.config.clientId === 'missing' || debugData.config.clientSecret === 'missing') {
        toast({
          title: "eBay Not Configured",
          description: "Please configure your eBay API credentials first. Check the project settings.",
          variant: "destructive"
        });
        return;
      }

      // Now proceed with OAuth - FIXED: Use direct fetch
      const authResponse = await fetch(`https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremFhcHR4ZndpeGdtYnJvb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODI2NzksImV4cCI6MjA2NjI1ODY3OX0.C5ivIgxoapGcsGpZJo_hOF9XUzRuXeVgyCbmawDeCes'
        },
        body: JSON.stringify({
          action: 'get_auth_url',
          state: crypto.randomUUID()
        })
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('Edge function error:', errorText);
        
        if (errorText.includes('Client ID') || errorText.includes('configuration')) {
          toast({
            title: "eBay Not Configured",
            description: "Please configure your eBay API credentials in the project settings first.",
            variant: "destructive"
          });
          return;
        }
        
        throw new Error(`Function error: ${authResponse.status} - ${errorText}`);
      }

      const data = await authResponse.json();

      console.log('Received OAuth URL data:', data);

      if (!data.auth_url) {
        throw new Error('No authorization URL received from server');
      }

      console.log('Redirecting to eBay OAuth URL:', data.auth_url);
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