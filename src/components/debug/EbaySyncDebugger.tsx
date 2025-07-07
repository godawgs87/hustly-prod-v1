import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
const EbaySyncDebugger = () => {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const {
    toast
  } = useToast();
  const runDebugCheck = async () => {
    setDebugging(true);
    setDebugResults(null);
    try {
      console.log('🔍 Starting eBay sync debug check...');
      const results: any = {
        user: null,
        ebayAccount: null,
        userProfile: null,
        listings: [],
        errors: []
      };

      // 1. Check user authentication
      const {
        data: userData,
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        results.errors.push('User not authenticated');
        console.error('❌ User auth failed:', userError);
      } else {
        results.user = {
          id: userData.user.id,
          email: userData.user.email
        };
        console.log('✅ User authenticated:', userData.user.email);
      }

      // 2. Check eBay account connection
      if (userData?.user) {
        const {
          data: ebayAccount,
          error: ebayError
        } = await supabase.from('marketplace_accounts').select('*').eq('platform', 'ebay').eq('user_id', userData.user.id).eq('is_active', true).maybeSingle();
        if (ebayError) {
          results.errors.push(`eBay account query failed: ${ebayError.message}`);
          console.error('❌ eBay account query failed:', ebayError);
        } else if (!ebayAccount) {
          results.errors.push('No active eBay account found');
          console.error('❌ No eBay account found');
        } else {
          results.ebayAccount = {
            connected: ebayAccount.is_connected,
            username: ebayAccount.account_username,
            expiresAt: ebayAccount.oauth_expires_at,
            lastSync: ebayAccount.last_sync_at
          };
          console.log('✅ eBay account found:', ebayAccount.account_username);

          // Check if token is expired
          if (ebayAccount.oauth_expires_at) {
            const expiryTime = new Date(ebayAccount.oauth_expires_at);
            const now = new Date();
            if (expiryTime <= now) {
              results.errors.push('eBay token has expired');
              console.error('❌ eBay token expired:', ebayAccount.oauth_expires_at);
            } else {
              console.log('✅ eBay token valid until:', ebayAccount.oauth_expires_at);
            }
          }
        }

        // 3. Check user profile and policies
        const {
          data: userProfile,
          error: profileError
        } = await supabase.from('user_profiles').select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id, ebay_policies_created_at').eq('id', userData.user.id).maybeSingle();
        if (profileError) {
          results.errors.push(`User profile query failed: ${profileError.message}`);
          console.error('❌ User profile query failed:', profileError);
        } else if (!userProfile) {
          results.errors.push('No user profile found');
          console.error('❌ No user profile found');
        } else {
          results.userProfile = {
            paymentPolicy: userProfile.ebay_payment_policy_id,
            returnPolicy: userProfile.ebay_return_policy_id,
            fulfillmentPolicy: userProfile.ebay_fulfillment_policy_id,
            policiesCreatedAt: userProfile.ebay_policies_created_at
          };
          console.log('✅ User profile found with policies:', {
            payment: userProfile.ebay_payment_policy_id?.substring(0, 20) + '...',
            return: userProfile.ebay_return_policy_id?.substring(0, 20) + '...',
            fulfillment: userProfile.ebay_fulfillment_policy_id?.substring(0, 20) + '...'
          });

          // Check policy validation
          const hasPolicies = !!(userProfile.ebay_payment_policy_id && userProfile.ebay_return_policy_id && userProfile.ebay_fulfillment_policy_id);
          if (!hasPolicies) {
            results.errors.push('eBay policies not configured');
            console.error('❌ eBay policies missing');
          } else {
            // Check for placeholder values
            const placeholderPolicies = ['DEFAULT_PAYMENT_POLICY', 'DEFAULT_RETURN_POLICY', 'DEFAULT_FULFILLMENT_POLICY', 'INDIVIDUAL_PAYMENT_POLICY', 'INDIVIDUAL_RETURN_POLICY', 'INDIVIDUAL_FULFILLMENT_POLICY', 'MANUAL_ENTRY_REQUIRED_PAYMENT', 'MANUAL_ENTRY_REQUIRED_RETURN', 'MANUAL_ENTRY_REQUIRED_FULFILLMENT'];
            const hasPlaceholders = placeholderPolicies.includes(userProfile.ebay_payment_policy_id) || placeholderPolicies.includes(userProfile.ebay_return_policy_id) || placeholderPolicies.includes(userProfile.ebay_fulfillment_policy_id);
            if (hasPlaceholders) {
              results.errors.push('eBay policies are placeholder values and need to be refreshed');
              console.error('❌ Placeholder policies detected');
            } else {
              // Check for eBay default policies (valid for individual accounts)
              const ebayDefaults = ['EBAY_DEFAULT_PAYMENT', 'EBAY_DEFAULT_RETURN', 'EBAY_DEFAULT_FULFILLMENT'];
              const hasEbayDefaults = ebayDefaults.includes(userProfile.ebay_payment_policy_id) || ebayDefaults.includes(userProfile.ebay_return_policy_id) || ebayDefaults.includes(userProfile.ebay_fulfillment_policy_id);
              if (hasEbayDefaults) {
                console.log('✅ Using eBay default policies (individual account)');
              } else {
                // Check policy ID lengths (real eBay IDs are typically 15+ characters)
                if (userProfile.ebay_payment_policy_id.length < 15 || userProfile.ebay_return_policy_id.length < 15 || userProfile.ebay_fulfillment_policy_id.length < 15) {
                  results.errors.push('eBay policy IDs appear invalid (too short)');
                  console.error('❌ Policy IDs too short');
                } else {
                  console.log('✅ Policy IDs appear valid');
                }
              }
            }
          }
        }

        // 4. Check sample listings
        const {
          data: listings,
          error: listingsError
        } = await supabase.from('listings').select('id, title, price, condition, ebay_category_id').eq('user_id', userData.user.id).limit(3);
        if (listingsError) {
          results.errors.push(`Listings query failed: ${listingsError.message}`);
          console.error('❌ Listings query failed:', listingsError);
        } else {
          results.listings = listings || [];
          console.log('✅ Found', listings?.length || 0, 'listings');
        }
      }
      setDebugResults(results);
      console.log('🔍 Debug check complete:', results);
    } catch (error: any) {
      console.error('❌ Debug check failed:', error);
      toast({
        title: "Debug Check Failed",
        description: error.message || "An error occurred during debug check",
        variant: "destructive"
      });
    } finally {
      setDebugging(false);
    }
  };
  const testSync = async (listingId: string) => {
    try {
      console.log('🧪 Testing sync for listing:', listingId);
      const {
        data,
        error
      } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: {
          listingId: listingId,
          dryRun: true // Test mode
        }
      });
      console.log('🧪 Sync test result:', {
        data,
        error
      });
      if (error) {
        toast({
          title: "Sync Test Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sync Test Result",
          description: data?.status === 'dry_run_success' ? 'Test passed!' : `Status: ${data?.status}`,
          variant: data?.status === 'dry_run_success' ? "default" : "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Sync test failed:', error);
      toast({
        title: "Sync Test Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return;
};
export default EbaySyncDebugger;