import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Eye,
  Bug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EbayDebugDashboard = () => {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [edgeFunctionStatus, setEdgeFunctionStatus] = useState<any>({});
  const { toast } = useToast();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  const checkAccountStatus = async () => {
    setLoading(true);
    addLog('🔍 Checking eBay account status...');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        addLog('❌ Authentication failed');
        return;
      }
      addLog(`✅ User authenticated: ${user.email}`);

      // Check marketplace accounts
      const { data: accounts, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay');

      if (accountError) {
        addLog(`❌ Database error: ${accountError.message}`);
        return;
      }

      addLog(`📊 Found ${accounts?.length || 0} eBay accounts in database`);
      
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        addLog(`📋 Account details: ${account.account_username}`);
        addLog(`🔑 Token present: ${!!account.oauth_token}`);
        addLog(`📏 Token length: ${account.oauth_token?.length || 0} characters`);
        addLog(`⏰ Expires at: ${account.oauth_expires_at || 'Not set'}`);
        addLog(`🔌 Connected: ${account.is_connected}`);
        addLog(`✅ Active: ${account.is_active}`);
        
        // Check token expiration
        if (account.oauth_expires_at) {
          const expiresAt = new Date(account.oauth_expires_at);
          const now = new Date();
          const isExpired = expiresAt < now;
          addLog(`⏱️ Token expired: ${isExpired}`);
          if (isExpired) {
            addLog(`⚠️ Token expired ${Math.floor((now.getTime() - expiresAt.getTime()) / 1000 / 60)} minutes ago`);
          }
        }

        setAccountStatus(account);
      } else {
        addLog('❌ No eBay accounts found');
        setAccountStatus(null);
      }

    } catch (error: any) {
      addLog(`❌ Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async (functionName: string, payload: any) => {
    addLog(`🔄 Testing edge function: ${functionName}`);
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) {
        addLog(`❌ ${functionName} error: ${error.message}`);
        setEdgeFunctionStatus(prev => ({ ...prev, [functionName]: 'error' }));
        return;
      }

      addLog(`✅ ${functionName} response: ${JSON.stringify(data)}`);
      setEdgeFunctionStatus(prev => ({ ...prev, [functionName]: 'success' }));
      
    } catch (error: any) {
      addLog(`❌ ${functionName} exception: ${error.message}`);
      setEdgeFunctionStatus(prev => ({ ...prev, [functionName]: 'error' }));
    }
  };

  const testAllEdgeFunctions = async () => {
    setLoading(true);
    addLog('🧪 Testing all eBay edge functions...');
    
    // Test ebay-oauth function
    await testEdgeFunction('ebay-oauth', { action: 'test' });
    
    // Test ebay-integration function  
    await testEdgeFunction('ebay-integration', { action: 'test_connection' });
    
    setLoading(false);
  };

  const diagnoseFullFlow = async () => {
    setLoading(true);
    addLog('🔍 Starting comprehensive eBay integration diagnosis...');
    
    // Step 1: Check authentication
    addLog('📝 Step 1: Authentication check');
    await checkAccountStatus();
    
    // Step 2: Test edge functions
    addLog('📝 Step 2: Edge function tests');
    await testAllEdgeFunctions();
    
    // Step 3: Check environment variables
    addLog('📝 Step 3: Environment variables check');
    await testEdgeFunction('ebay-oauth', { action: 'debug' });
    
    addLog('✅ Diagnosis complete');
    setLoading(false);
  };

  const fixCommonIssues = async () => {
    setLoading(true);
    addLog('🔧 Attempting to fix common eBay integration issues...');
    
    try {
      // Clean up invalid/expired accounts
      if (accountStatus && accountStatus.oauth_expires_at) {
        const expiresAt = new Date(accountStatus.oauth_expires_at);
        const now = new Date();
        
        if (expiresAt < now) {
          addLog('🧹 Cleaning up expired eBay account...');
          const { error } = await supabase
            .from('marketplace_accounts')
            .update({ is_active: false, is_connected: false })
            .eq('id', accountStatus.id);
            
          if (error) {
            addLog(`❌ Failed to clean up account: ${error.message}`);
          } else {
            addLog('✅ Expired account cleaned up');
          }
        }
      }
      
      addLog('✅ Fix attempt completed');
      
      // Refresh status
      await checkAccountStatus();
      
    } catch (error: any) {
      addLog(`❌ Fix failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: any) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    if (status === 'success') return <Badge className="bg-green-100 text-green-800">Working</Badge>;
    if (status === 'error') return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  const renderAccountStatus = () => {
    if (!accountStatus) {
      return (
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <span>No eBay account connected</span>
        </div>
      );
    }

    const isTokenValid = accountStatus.oauth_token && accountStatus.oauth_token.length > 50;
    const isNotExpired = !accountStatus.oauth_expires_at || new Date(accountStatus.oauth_expires_at) > new Date();
    const isActive = accountStatus.is_active && accountStatus.is_connected;
    
    const isHealthy = isTokenValid && isNotExpired && isActive;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          <span className="font-medium">eBay Account: {accountStatus.account_username}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Token Valid: {isTokenValid ? '✅' : '❌'}</div>
          <div>Not Expired: {isNotExpired ? '✅' : '❌'}</div>
          <div>Connected: {accountStatus.is_connected ? '✅' : '❌'}</div>
          <div>Active: {accountStatus.is_active ? '✅' : '❌'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-white border-2 border-blue-500 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-600 flex items-center gap-2">
            <Bug className="w-4 h-4" />
            eBay Debug Dashboard
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Account Status</h4>
                {renderAccountStatus()}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Edge Functions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>ebay-oauth:</span>
                    {renderStatusBadge(edgeFunctionStatus['ebay-oauth'])}
                  </div>
                  <div className="flex justify-between">
                    <span>ebay-integration:</span>
                    {renderStatusBadge(edgeFunctionStatus['ebay-integration'])}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={checkAccountStatus}
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Status
              </Button>
            </TabsContent>
            
            <TabsContent value="tests" className="space-y-3">
              <div className="space-y-2">
                <Button 
                  onClick={diagnoseFullFlow}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Full Diagnosis
                </Button>
                
                <Button 
                  onClick={testAllEdgeFunctions}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Test Edge Functions
                </Button>
                
                <Button 
                  onClick={fixCommonIssues}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Fix Common Issues
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Debug Logs</h4>
                <Button onClick={clearLogs} size="sm" variant="ghost">
                  Clear
                </Button>
              </div>
              
              <div className="bg-gray-50 p-2 rounded text-xs h-48 overflow-y-auto font-mono">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No logs yet...</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EbayDebugDashboard;