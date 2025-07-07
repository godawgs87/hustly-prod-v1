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
  const { toast } = useToast();

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
      const { data: userData, error: userError } = await supabase.auth.getUser();
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
        const { data: ebayAccount, error: ebayError } = await supabase
          .from('marketplace_accounts')
          .select('*')
          .eq('platform', 'ebay')
          .eq('user_id', userData.user.id)
          .eq('is_active', true)
          .maybeSingle();

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
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id, ebay_policies_created_at')
          .eq('id', userData.user.id)
          .maybeSingle();

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
          const hasPolicies = !!(userProfile.ebay_payment_policy_id && 
                                 userProfile.ebay_return_policy_id && 
                                 userProfile.ebay_fulfillment_policy_id);

          if (!hasPolicies) {
            results.errors.push('eBay policies not configured');
            console.error('❌ eBay policies missing');
          } else {
            // Check for placeholder values
            const placeholderPolicies = [
              'DEFAULT_PAYMENT_POLICY', 'DEFAULT_RETURN_POLICY', 'DEFAULT_FULFILLMENT_POLICY',
              'INDIVIDUAL_PAYMENT_POLICY', 'INDIVIDUAL_RETURN_POLICY', 'INDIVIDUAL_FULFILLMENT_POLICY',
              'MANUAL_ENTRY_REQUIRED_PAYMENT', 'MANUAL_ENTRY_REQUIRED_RETURN', 'MANUAL_ENTRY_REQUIRED_FULFILLMENT'
            ];

            const hasPlaceholders = placeholderPolicies.includes(userProfile.ebay_payment_policy_id) ||
                                    placeholderPolicies.includes(userProfile.ebay_return_policy_id) ||
                                    placeholderPolicies.includes(userProfile.ebay_fulfillment_policy_id);

            if (hasPlaceholders) {
              results.errors.push('eBay policies are placeholder values and need to be refreshed');
              console.error('❌ Placeholder policies detected');
            } else {
              // Check for eBay default policies (valid for individual accounts)
              const ebayDefaults = [
                'EBAY_DEFAULT_PAYMENT', 'EBAY_DEFAULT_RETURN', 'EBAY_DEFAULT_FULFILLMENT'
              ];

              const hasEbayDefaults = ebayDefaults.includes(userProfile.ebay_payment_policy_id) ||
                                      ebayDefaults.includes(userProfile.ebay_return_policy_id) ||
                                      ebayDefaults.includes(userProfile.ebay_fulfillment_policy_id);

              if (hasEbayDefaults) {
                console.log('✅ Using eBay default policies (individual account)');
              } else {
                // Check policy ID lengths (real eBay IDs are typically 15+ characters)
                if (userProfile.ebay_payment_policy_id.length < 15 || 
                    userProfile.ebay_return_policy_id.length < 15 || 
                    userProfile.ebay_fulfillment_policy_id.length < 15) {
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
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, price, condition, ebay_category_id')
          .eq('user_id', userData.user.id)
          .limit(3);

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
      
      const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: {
          listingId: listingId,
          dryRun: true // Test mode
        }
      });

      console.log('🧪 Sync test result:', { data, error });
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 eBay Sync Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDebugCheck}
          disabled={debugging}
          className="w-full"
        >
          {debugging ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running Debug Check...
            </>
          ) : (
            'Run Debug Check'
          )}
        </Button>

        {debugResults && (
          <div className="space-y-4">
            <h3 className="font-semibold">Debug Results:</h3>
            
            {/* User Status */}
            <div className="flex items-center gap-2">
              {debugResults.user ? <CheckCircle className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
              <span>User Authentication</span>
              {debugResults.user && <Badge variant="secondary">{debugResults.user.email}</Badge>}
            </div>

            {/* eBay Account Status */}
            <div className="flex items-center gap-2">
              {debugResults.ebayAccount ? <CheckCircle className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
              <span>eBay Account Connection</span>
              {debugResults.ebayAccount && (
                <div className="flex gap-2">
                  <Badge variant="secondary">{debugResults.ebayAccount.username}</Badge>
                  <Badge variant={debugResults.ebayAccount.connected ? "default" : "destructive"}>
                    {debugResults.ebayAccount.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              )}
            </div>

            {/* User Profile Status */}
            <div className="flex items-center gap-2">
              {debugResults.userProfile ? <CheckCircle className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
              <span>eBay Policies</span>
              {debugResults.userProfile && (
                <div className="flex flex-col gap-1 text-xs">
                  <span>Payment: {debugResults.userProfile.paymentPolicy?.substring(0, 25)}...</span>
                  <span>Return: {debugResults.userProfile.returnPolicy?.substring(0, 25)}...</span>
                  <span>Fulfillment: {debugResults.userProfile.fulfillmentPolicy?.substring(0, 25)}...</span>
                </div>
              )}
            </div>

            {/* Listings */}
            <div className="flex items-center gap-2">
              <span>Available Listings: {debugResults.listings.length}</span>
            </div>

            {/* Errors */}
            {debugResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issues Found:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {debugResults.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Test Sync Buttons */}
            {debugResults.listings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Test Sync (Dry Run):</h4>
                {debugResults.listings.map((listing: any) => (
                  <Button 
                    key={listing.id}
                    variant="outline" 
                    size="sm"
                    onClick={() => testSync(listing.id)}
                  >
                    Test: {listing.title?.substring(0, 30)}...
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EbaySyncDebugger;