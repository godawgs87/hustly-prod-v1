import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bug, Zap, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Listing } from '@/types/Listing';

interface InventoryDebugActionsProps {
  listing: Listing;
  onRefresh?: () => void;
}

const InventoryDebugActions = ({ listing, onRefresh }: InventoryDebugActionsProps) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const runSyncTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('🔍 Running comprehensive sync test for listing:', listing.id);
      
      // Step 1: Dry run test
      console.log('📝 Step 1: Dry run validation...');
      const { data: dryRunData, error: dryRunError } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: { 
          listingId: listing.id,
          dryRun: true
        }
      });

      console.log('📝 Dry run result:', dryRunData, dryRunError);

      // Step 2: Check listing photos
      console.log('📸 Step 2: Checking photos...');
      const { data: photos, error: photosError } = await supabase
        .from('listing_photos')
        .select('*')
        .eq('listing_id', listing.id);

      console.log('📸 Photos result:', photos, photosError);

      // Step 3: Check eBay account
      console.log('🔗 Step 3: Checking eBay account...');
      const { data: ebayAccount, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .maybeSingle();

      console.log('🔗 eBay account result:', ebayAccount, accountError);

      // Step 4: Check user profile
      console.log('👤 Step 4: Checking user profile...');
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id, shipping_address_line1, business_phone')
        .eq('id', user?.id)
        .single();

      console.log('👤 Profile result:', profile, profileError);

      // Compile results
      const results = {
        dryRun: {
          success: !dryRunError && dryRunData?.status === 'dry_run_success',
          data: dryRunData,
          error: dryRunError?.message
        },
        photos: {
          count: photos?.length || 0,
          success: (photos?.length || 0) > 0,
          error: photosError?.message
        },
        ebayAccount: {
          connected: !!ebayAccount && ebayAccount.is_connected,
          active: !!ebayAccount && ebayAccount.is_active,
          hasToken: !!ebayAccount?.oauth_token,
          tokenLength: ebayAccount?.oauth_token?.length || 0,
          expires: ebayAccount?.oauth_expires_at,
          error: accountError?.message
        },
        profile: {
          hasPolicies: !!(profile?.ebay_payment_policy_id && profile?.ebay_return_policy_id && profile?.ebay_fulfillment_policy_id),
          hasAddress: !!profile?.shipping_address_line1,
          hasPhone: !!profile?.business_phone,
          error: profileError?.message
        },
        listing: {
          hasTitle: !!listing.title && listing.title.length >= 10,
          hasPrice: !!listing.price && listing.price > 0,
          hasCondition: !!listing.condition,
          hasCategory: !!listing.ebay_category_id,
          hasDescription: !!listing.description
        }
      };

      console.log('✅ Test results compiled:', results);
      setTestResults(results);

      const overallSuccess = results.dryRun.success && 
                           results.photos.success && 
                           results.ebayAccount.connected && 
                           results.profile.hasPolicies;

      toast({
        title: overallSuccess ? "✅ Sync Test Passed" : "❌ Sync Test Failed",
        description: overallSuccess 
          ? "All systems ready for eBay sync"
          : "Issues found - check debug results",
        variant: overallSuccess ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('❌ Sync test failed:', error);
      toast({
        title: "Test Failed",
        description: `Sync test error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7">
          <Bug className="w-3 h-3 mr-1" />
          Debug
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Sync Debug for "{listing.title}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This will run comprehensive tests to diagnose why eBay sync might be failing.
            </AlertDescription>
          </Alert>

          {testing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Running diagnostic tests...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {testResults && (
            <div className="space-y-4">
              <h4 className="font-medium">Test Results:</h4>
              
              {/* Dry Run Test */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(testResults.dryRun.success)}
                  <span className="font-medium">Dry Run Validation</span>
                  <Badge variant={testResults.dryRun.success ? 'default' : 'destructive'}>
                    {testResults.dryRun.success ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
                {testResults.dryRun.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {testResults.dryRun.error}
                  </div>
                )}
                {testResults.dryRun.data?.validation && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Validation Errors: {testResults.dryRun.data.validation.errors?.join(', ') || 'None'}
                  </div>
                )}
              </div>

              {/* Photos Check */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(testResults.photos.success)}
                  <span className="font-medium">Photos</span>
                  <Badge variant={testResults.photos.success ? 'default' : 'destructive'}>
                    {testResults.photos.count} photo{testResults.photos.count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {testResults.photos.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {testResults.photos.error}
                  </div>
                )}
              </div>

              {/* eBay Account Check */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(testResults.ebayAccount.connected && testResults.ebayAccount.active)}
                  <span className="font-medium">eBay Account</span>
                  <Badge variant={testResults.ebayAccount.connected ? 'default' : 'destructive'}>
                    {testResults.ebayAccount.connected ? 'Connected' : 'Not Connected'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Active: {testResults.ebayAccount.active ? 'Yes' : 'No'}</div>
                  <div>• Token: {testResults.ebayAccount.hasToken ? `${testResults.ebayAccount.tokenLength} chars` : 'Missing'}</div>
                  {testResults.ebayAccount.expires && (
                    <div>• Expires: {new Date(testResults.ebayAccount.expires).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Profile Check */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(testResults.profile.hasPolicies && testResults.profile.hasAddress)}
                  <span className="font-medium">Profile Setup</span>
                  <Badge variant={testResults.profile.hasPolicies ? 'default' : 'destructive'}>
                    {testResults.profile.hasPolicies ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Business Policies: {testResults.profile.hasPolicies ? 'Yes' : 'No'}</div>
                  <div>• Address: {testResults.profile.hasAddress ? 'Yes' : 'No'}</div>
                  <div>• Phone: {testResults.profile.hasPhone ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Listing Check */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(
                    testResults.listing.hasTitle && 
                    testResults.listing.hasPrice && 
                    testResults.listing.hasCondition &&
                    testResults.listing.hasCategory
                  )}
                  <span className="font-medium">Listing Data</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Title: {testResults.listing.hasTitle ? 'Valid' : 'Too short'}</div>
                  <div>• Price: {testResults.listing.hasPrice ? 'Set' : 'Missing'}</div>
                  <div>• Condition: {testResults.listing.hasCondition ? 'Set' : 'Missing'}</div>
                  <div>• eBay Category: {testResults.listing.hasCategory ? 'Set' : 'Missing'}</div>
                  <div>• Description: {testResults.listing.hasDescription ? 'Set' : 'Missing'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={runSyncTest}
              disabled={testing}
              className="flex-1"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Sync Test
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={testing}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDebugActions;