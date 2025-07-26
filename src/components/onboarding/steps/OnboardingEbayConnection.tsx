import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingEbayConnectionProps {
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const OnboardingEbayConnection = ({ isConnected, onConnectionChange }: OnboardingEbayConnectionProps) => {
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const initiateEbayConnection = async () => {
    setConnecting(true);
    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in first.');
      }

      const { data, error } = await supabase.functions.invoke('ebay-oauth-modern', {
        body: { 
          action: 'get_auth_url',
          state: 'onboarding_flow',
          origin: window.location.origin
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Redirect in same window
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('eBay OAuth initiation failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to initiate eBay connection',
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  if (isConnected) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>eBay Connected!</strong> Your eBay account is ready for listing automation.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Connect your eBay account to enable automatic listing creation and inventory sync.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={initiateEbayConnection}
        disabled={connecting}
        className="w-full"
      >
        {connecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting to eBay...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect eBay Account
          </>
        )}
      </Button>

      <div className="text-sm text-gray-600 space-y-1">
        <p>✓ Secure OAuth connection</p>
        <p>✓ No developer account required</p>
        <p>✓ Automatic inventory sync</p>
      </div>
    </div>
  );
};

export default OnboardingEbayConnection;