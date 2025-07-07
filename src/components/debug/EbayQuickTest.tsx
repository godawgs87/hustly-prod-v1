import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
            addLog(`   Account ${i+1}: ${acc.account_username}, connected: ${acc.is_connected}, active: ${acc.is_active}`);
          });
        }
        
        throw new Error('eBay account not connected');
      }
      
      addLog(`✅ eBay account: ${ebayAccount.account_username} (token: ${ebayAccount.oauth_token.length} chars)`);

      // Step 3: Call eBay integration function
      addLog('🚀 Calling eBay integration function...');
      
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: {
          action: 'publish_listing',
          listingId: listing.id
        }
      });
      const duration = Date.now() - startTime;
      
      addLog(`📡 Function call completed in ${duration}ms`);

      if (error) {
        addLog(`❌ Function error: ${error.message}`);
        
        // Try to get more details from the error
        if (error.details) {
          addLog(`📄 Error details: ${JSON.stringify(error.details)}`);
        }
        if (error.hint) {
          addLog(`💡 Error hint: ${error.hint}`);
        }
        
        throw new Error(`Function call failed: ${error.message}`);
      }

      // Check if we got a response but it might contain an error
      if (!data) {
        addLog(`❌ No data returned from function`);
        throw new Error('No data returned from eBay integration function');
      }

      addLog(`📦 Function response: ${JSON.stringify(data, null, 2)}`);

      if (data?.status === 'success') {
        addLog('🎉 SUCCESS! Listing synced to eBay');
        
        toast({
          title: "eBay Sync Test Successful! 🎉",
          description: `"${listing.title}" was successfully synced to eBay`
        });
      } else {
        addLog(`⚠️ Function returned status: ${data?.status}`);
        addLog(`📄 Error details: ${data?.error || 'No error details provided'}`);
        
        toast({
          title: "eBay Sync Test Failed",
          description: data?.error || 'Function returned unsuccessful status',
          variant: "destructive"
        });
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Quick eBay Sync Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testEbaySyncNow}
            disabled={testing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Sync...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test eBay Sync Now
              </>
            )}
          </Button>
        </div>

        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Log:</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
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