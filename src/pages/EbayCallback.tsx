
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const OAUTH_PROCESSING_KEY = 'ebay_oauth_processing';
const OAUTH_HANDLED_KEY = 'ebay_oauth_handled';

const EbayCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(true);
  const queryClient = useQueryClient();

  // Wait for auth to initialize before processing
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Waiting for auth to initialize...');
      return;
    }

    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔄 eBay OAuth callback received:', { 
          code: code ? 'present' : 'missing', 
          state: state ? 'present' : 'missing', 
          error,
          hasUser: !!user,
          hasSession: !!session
        });

        if (error) {
          throw new Error(`eBay OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from eBay');
        }

        // If we've already handled a recent OAuth completion, avoid re-processing
        if (localStorage.getItem(OAUTH_HANDLED_KEY) === 'true') {
          console.log('🔁 OAuth already handled, redirecting to settings');
          localStorage.removeItem('ebay_oauth_pending');
          navigate('/settings', { replace: true });
          return;
        }

        // Check if we have a user/session from auth provider
        if (!user || !session) {
          console.log('⚠️ No authenticated user, storing OAuth data for later');
          localStorage.setItem('ebay_oauth_pending', JSON.stringify({ code, state }));
          
          toast({
            title: "Authentication Required",
            description: "Please log in to complete your eBay connection. Your connection will be completed automatically after login.",
            variant: "destructive"
          });
          
          // Wait then redirect to auth
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 3000);
          return;
        }

        console.log('✅ User authenticated, proceeding with token exchange');

        // Prevent duplicate parallel processing across mounts/renders
        if (sessionStorage.getItem(OAUTH_PROCESSING_KEY) === '1') {
          console.log('⏸️ OAuth processing already in progress, skipping duplicate');
          return;
        }
        sessionStorage.setItem(OAUTH_PROCESSING_KEY, '1');

        // Exchange code for token with explicit session token
        const { data: responseData, error: functionError } = await supabase.functions.invoke('ebay-oauth-modern', {
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

        console.log('📡 Function response:', { data: responseData, error: functionError });

        if (functionError) {
          console.error('❌ Function returned error:', functionError);
          // If the function returns a 400 after a prior success (used/invalid code),
          // verify connection and treat as success if already connected
          try {
            const { data: accounts } = await supabase
              .from('marketplace_accounts')
              .select('*')
              .eq('platform', 'ebay')
              .eq('user_id', user!.id)
              .eq('is_connected', true)
              .eq('is_active', true);

            if (accounts && accounts.length > 0) {
              console.log('✅ Connection already established, proceeding');
              localStorage.removeItem('ebay_oauth_pending');
              localStorage.setItem(OAUTH_HANDLED_KEY, 'true');
              queryClient.invalidateQueries({ queryKey: ['ebay-connection-status', user!.id] });
              toast({
                title: "eBay Connection Confirmed",
                description: "Your eBay account is connected.",
              });
              setTimeout(() => {
                navigate('/settings', { replace: true });
              }, 1500);
              return;
            }
          } catch (verifyErr) {
            console.warn('Verification after function error failed:', verifyErr);
          }

          throw new Error(`Function error: ${functionError.message}`);
        }

        console.log('📊 Token exchange response:', responseData);
        
        if (responseData?.success || responseData?.status === 'success') {
          // Clear any pending OAuth data
          localStorage.removeItem('ebay_oauth_pending');
          localStorage.setItem(OAUTH_HANDLED_KEY, 'true');
          queryClient.invalidateQueries({ queryKey: ['ebay-connection-status', user!.id] });
          
          toast({
            title: "eBay Connected Successfully! 🎉",
            description: "Your eBay account is now connected and ready to use"
          });

          // Wait a moment then redirect to settings
          setTimeout(() => {
            navigate('/settings', { replace: true });
          }, 2000);
        } else {
          console.error('❌ eBay connection failed - unexpected response:', responseData);
          throw new Error(responseData?.error || 'Failed to complete eBay connection');
        }

      } catch (error: any) {
        console.error('❌ eBay OAuth callback error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || 'Failed to connect your eBay account',
          variant: "destructive"
        });

        // Wait a moment then redirect to settings
        setTimeout(() => {
          navigate('/settings', { replace: true });
        }, 3000);
      } finally {
        // Always clear processing lock
        sessionStorage.removeItem(OAUTH_PROCESSING_KEY);
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, toast, user, session, authLoading]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <h2 className="text-xl font-semibold">
            {processing ? "Connecting to eBay" : "Processing Complete"}
          </h2>
          <p className="text-gray-600">
            {processing 
              ? "Please wait while we complete your eBay connection..."
              : "Redirecting you back to settings..."
            }
          </p>
          {!processing && (
            <div className="mt-4">
              <button 
                onClick={() => navigate('/settings')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Continue to Settings
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EbayCallback;
