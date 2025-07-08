import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EbayShippingPhaseTest = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('PHASE_1_NO_CODE');
  const { toast } = useToast();

  const phases = [
    { id: 'PHASE_1_NO_CODE', name: 'Phase 1: No Service Code', description: 'Test with no serviceCode - let eBay use defaults' },
    { id: 'test_ebay_shipping_api', name: 'Phase 2: Query eBay API', description: 'Ask eBay what service codes they accept' },
    { id: 'PHASE_3_MODERN_USPS', name: 'Phase 3: Modern USPS', description: 'Test modern service codes like USPS_GROUND_ADVANTAGE' },
    { id: 'PHASE_4_WORKING_CONFIG', name: 'Phase 4: Working Config', description: 'Use the proven working configuration' }
  ];

  const runPhaseTest = async (phaseId: string) => {
    setIsLoading(true);
    setCurrentPhase(phaseId);
    
    try {
      // Set environment variable for the phase
      if (phaseId.startsWith('PHASE_')) {
        // This would normally be set as an environment variable
        // For testing, we'll include it in the request
        console.log(`🧪 Setting test phase: ${phaseId}`);
      }

      let result;
      if (phaseId === 'test_ebay_shipping_api') {
        // Phase 2: Query eBay API
        result = await supabase.functions.invoke('ebay-inventory-sync', {
          body: { action: 'test_ebay_shipping_api' }
        });
      } else {
        // Phase 1, 3, 4: Test shipping service with specific phase
        result = await supabase.functions.invoke('ebay-inventory-sync', {
          body: { 
            action: 'test_shipping_service',
            userPreference: 'usps_priority',
            testPhase: phaseId
          }
        });
      }

      if (result.error) {
        throw result.error;
      }

      setTestResults({
        phase: phaseId,
        success: true,
        data: result.data
      });

      toast({
        title: "Phase Test Complete",
        description: `${phases.find(p => p.id === phaseId)?.name} completed successfully`,
      });

    } catch (error: any) {
      setTestResults({
        phase: phaseId,
        success: false,
        error: error.message
      });

      toast({
        title: "Phase Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testActualSync = async () => {
    setIsLoading(true);
    
    try {
      // This would sync an actual listing with the current phase settings
      toast({
        title: "Ready for Real Test",
        description: "Go to inventory and try syncing a listing to test the current phase configuration",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 eBay Shipping Service Phase Testing
            <Badge variant="outline">Systematic Debugging</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Run each phase systematically to find the working eBay shipping configuration:
          </div>

          <div className="grid gap-3">
            {phases.map((phase) => (
              <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{phase.name}</div>
                  <div className="text-sm text-muted-foreground">{phase.description}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runPhaseTest(phase.id)}
                  disabled={isLoading}
                  className="ml-4"
                >
                  {isLoading && currentPhase === phase.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            ))}
          </div>

          {testResults && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  Results: {phases.find(p => p.id === testResults.phase)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(testResults.data || testResults.error, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={testActualSync}
              disabled={isLoading}
              className="flex-1"
            >
              Ready to Test Real Sync
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Run Phase 1 first - simplest approach</li>
              <li>If Phase 1 fails, run Phase 2 to see what eBay wants</li>
              <li>Use Phase 2 results to guide Phase 3 testing</li>
              <li>Phase 4 implements the working solution</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EbayShippingPhaseTest;