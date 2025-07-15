import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EbayService } from '@/services/api/ebayService';

const EbayQuickTest = () => {
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(`[EBAY-TEST] ${message}`);
  };

  const testEbaySyncNow = async () => {
    setTesting(true);
    setLogs([]);

    try {
      addLog('Starting eBay sync test...');

      // Step 1: Get first listing
      addLog('📋 Finding a listing to test with...');
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, title, price, description')
        .limit(1)
        .single();

      if (listingError || !listing) {
        throw new Error('No listings found to test with');
      }
      addLog(`✅ Found listing: "${listing.title}" ($${listing.price})`);

      // Step 2: Check eBay account
      addLog('🔍 Checking eBay account...');
      const { data: ebayAccount, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('account_username, oauth_token, oauth_expires_at, is_connected, is_active')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .maybeSingle();

      if (accountError) {
        addLog(`❌ Database error: ${accountError.message}`);
        throw new Error(`Database error: ${accountError.message}`);
      }

      if (!ebayAccount) {
        addLog('❌ No eBay account found with is_connected = true');
        
        // Let's check what accounts exist
        const { data: allAccounts } = await supabase
          .from('marketplace_accounts')
          .select('platform, account_username, is_connected, is_active')
          .eq('platform', 'ebay');
        
        addLog(`📊 Found ${allAccounts?.length || 0} eBay accounts total`);
        if (allAccounts && allAccounts.length > 0) {
          allAccounts.forEach((acc, i) => {
            addLog(`   Account ${i + 1}: ${acc.account_username}, connected: ${acc.is_connected}, active: ${acc.is_active}`);
          });
        }
        throw new Error('eBay account not connected');
      }
      addLog(`✅ eBay account: ${ebayAccount.account_username} (token: ${ebayAccount.oauth_token.length} chars)`);

      // Step 3: Call EbayService sync method
      addLog('🚀 Calling EbayService.syncListing...');
      const startTime = Date.now();
      
      try {
        const data = await EbayService.syncListing(listing.id, { dryRun: false });
        const duration = Date.now() - startTime;
        addLog(`📡 EbayService call completed in ${duration}ms`);
        
        if (data?.status === 'success') {
          addLog(`✅ Success: ${data.platform_listing_id}`);
          addLog(`🔗 eBay URL: ${data.platform_url}`);
          addLog('🎉 SUCCESS! Listing synced to eBay');
          toast({
            title: "eBay Sync Test Successful! 🎉",
            description: `"${listing.title}" was successfully synced to eBay`
          });
        } else {
          addLog(`❌ Sync failed: ${data?.error || 'Unknown error'}`);
          if (data?.details) {
            addLog(`📋 Details: ${JSON.stringify(data.details, null, 2)}`);
          }
          toast({
            title: "eBay Sync Test Failed",
            description: data?.error || 'Function returned unsuccessful status',
            variant: "destructive"
          });
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        addLog(`📡 EbayService call failed in ${duration}ms`);
        addLog(`❌ Service error: ${error.message}`);
        throw error;
      }

    } catch (error: any) {
      addLog(`💥 Test failed: ${error.message}`);
      toast({
        title: "eBay Sync Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          eBay Quick Test (via EbayService)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={testEbaySyncNow} 
            disabled={testing}
            className="gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Test eBay Sync Now
              </>
            )}
          </Button>
          
          {logs.length > 0 && (
            <Badge variant={logs.some(log => log.includes('SUCCESS')) ? 'default' : 'secondary'}>
              {logs.length} logs
            </Badge>
          )}
        </div>

        {logs.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Test Results:</div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-xs font-mono flex items-start gap-2">
                  {log.includes('SUCCESS') || log.includes('✅') ? (
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : log.includes('❌') || log.includes('💥') ? (
                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={
                    log.includes('SUCCESS') || log.includes('✅') ? 'text-green-700' :
                    log.includes('❌') || log.includes('💥') ? 'text-red-700' :
                    'text-muted-foreground'
                  }>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EbayQuickTest;