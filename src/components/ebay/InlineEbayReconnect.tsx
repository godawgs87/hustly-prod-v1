import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InlineEbayReconnectProps {
  onConnectionSuccess?: () => void;
  onSkip?: () => void;
  message?: string;
}

const InlineEbayReconnect: React.FC<InlineEbayReconnectProps> = ({ 
  onConnectionSuccess, 
  onSkip,
  message = "Connect your eBay account to research comparable pricing for your item."
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initiateOAuthFlow = async () => {
    setLoading(true);
    console.log('🚀 [InlineReconnect] Initiating eBay OAuth flow...');
    
    try {
      // Ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to connect eBay. Please refresh the page and try again.');
      }

      console.log('✅ [InlineReconnect] User session verified');

      // Store the current URL to return to after OAuth
      sessionStorage.setItem('ebay_oauth_return_url', window.location.href);
      
      // Clean up any pending OAuth data before starting new flow
      localStorage.removeItem('ebay_oauth_pending');

      // Get OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
        body: { 
          action: 'get_auth_url', 
          state: 'ebay_oauth', 
          origin: window.location.origin 
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ [InlineReconnect] Edge function error:', error);
        throw new Error(`OAuth setup failed: ${error.message || 'Unknown edge function error'}`);
      }

      if (!data?.auth_url) {
        console.error('❌ [InlineReconnect] No auth URL in response:', data);
        throw new Error('Invalid response from OAuth service');
      }

      console.log('🔗 [InlineReconnect] Redirecting to eBay OAuth');
      
      // Open eBay OAuth in a popup window for better UX
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        data.auth_url,
        'ebay_oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (popup) {
        // Poll for popup closure
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            setLoading(false);
            
            // Check if connection was successful
            checkConnectionStatus();
          }
        }, 1000);
      } else {
        // Fallback to redirect if popup blocked
        window.location.href = data.auth_url;
      }
    } catch (error: any) {
      console.error('❌ [InlineReconnect] OAuth flow initiation failed:', error);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to eBay. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_active', true)
        .eq('is_connected', true)
        .maybeSingle();

      if (data && data.oauth_token) {
        console.log('✅ [InlineReconnect] eBay connection verified');
        toast({
          title: "eBay Connected Successfully! 🎉",
          description: "Your eBay account is now linked. Continuing with price research..."
        });
        
        if (onConnectionSuccess) {
          onConnectionSuccess();
        }
      }
    } catch (error) {
      console.error('❌ [InlineReconnect] Error checking connection status:', error);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            eBay Connection Required
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {message}
          </p>
          <div className="mt-4 flex space-x-3">
            <Button
              onClick={initiateOAuthFlow}
              disabled={loading}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect eBay Account
                </>
              )}
            </Button>
            {onSkip && (
              <Button
                onClick={onSkip}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Skip for Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineEbayReconnect;
