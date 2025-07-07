import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInventoryStore } from '@/stores/inventoryStore';
import { ListingService } from '@/services/ListingService';

const TableEditDebugPanel = () => {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { listings, isLoading, error, refetch } = useInventoryStore();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testTableEditFlow = async () => {
    addLog('🔄 Starting table edit flow test...');
    
    if (!listings || listings.length === 0) {
      addLog('❌ No listings found to test');
      return;
    }

    const testListing = listings[0];
    addLog(`📝 Using test listing: ${testListing.title} (ID: ${testListing.id})`);

    // Test the update operation
    const testUpdates = {
      title: `${testListing.title} - EDITED`,
      status: 'draft' as const
    };

    addLog(`🔄 Testing update with: ${JSON.stringify(testUpdates)}`);

    try {
      const result = await ListingService.updateListing(testListing.id, testUpdates);
      addLog(`📥 Update result: ${result}`);
      
      if (result) {
        addLog('✅ Table edit test PASSED');
        // Refresh inventory to see changes
        await refetch();
        addLog('🔄 Inventory refreshed');
      } else {
        addLog('❌ Table edit test FAILED - update returned false');
      }
    } catch (error: any) {
      addLog(`❌ Table edit test FAILED with exception: ${error.message}`);
    }
  };

  const testAuthStatus = async () => {
    addLog('🔄 Testing authentication status...');
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addLog(`❌ Auth error: ${error.message}`);
      } else if (user) {
        addLog(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
      } else {
        addLog('❌ No user found');
      }
    } catch (error: any) {
      addLog(`❌ Auth test failed: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          Debug Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-white border-2 border-purple-500 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-purple-600">Table Edit Debug</CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button 
              onClick={testAuthStatus}
              size="sm"
              variant="outline"
            >
              Test Auth
            </Button>
            <Button 
              onClick={testTableEditFlow}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              Test Edit
            </Button>
            <Button 
              onClick={clearLogs}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Status:</span>
              <Badge variant={isLoading ? "default" : error ? "destructive" : "secondary"}>
                {isLoading ? "Loading" : error ? "Error" : `${listings?.length || 0} items`}
              </Badge>
            </div>
          </div>

          <div className="bg-gray-50 p-2 rounded text-xs h-40 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-1 font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableEditDebugPanel;