
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const EbayCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔄 eBay OAuth callback received:', { 
          code: code ? 'present' : 'missing', 
          state: state ? 'present' : 'missing', 
          error 
        });

        if (error) {
          throw new Error(`eBay OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from eBay');
        }

        console.log('🔍 Processing eBay OAuth callback with code');

        // Get current session with extended retry logic
        let session = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!session && attempts < maxAttempts) {
          attempts++;
          console.log(`🔍 Attempting to get session (attempt ${attempts}/${maxAttempts})`);
          
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            if (attempts === maxAttempts) {
              throw new Error(`Session error: ${sessionError.message}`);
            }
          }
          
          session = currentSession;
          
          if (!session && attempts < maxAttempts) {
            console.log('⏳ No session found, waiting 2 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (!session) {
          // Instead of redirecting to auth, store OAuth data and show a message
          console.log('⚠️ No session found after retries, storing OAuth data');
          localStorage.setItem('ebay_oauth_pending', JSON.stringify({ code, state }));
          
          toast({
            title: "Session Required",
            description: "Please log in to complete the eBay connection. Your connection will be completed automatically after login.",
            variant: "destructive"
          });
          
          // Wait a moment then redirect to auth
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 3000);
          return;
        }

        console.log('✅ Session found, proceeding with token exchange');

        // Exchange code for token
        const { data: responseData, error: functionError } = await supabase.functions.invoke('ebay-oauth-modern', {
          body: {
            action: 'exchange_code',
            code: code,
            state: state
          }
        });

        console.log('📡 Function response:', { data: responseData, error: functionError });

        if (functionError) {
          console.error('❌ Function returned error:', functionError);
          throw new Error(`Function error: ${functionError.message}`);
        }

        console.log('📊 Token exchange response:', responseData);
        
        if (responseData?.success || responseData?.status === 'success') {
          // Clear any pending OAuth data
          localStorage.removeItem('ebay_oauth_pending');
          
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
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, toast]);

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
