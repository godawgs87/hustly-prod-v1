
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseHealth {
  isHealthy: boolean;
  responseTime: number | null;
  lastChecked: Date | null;
  errorCount: number;
}

export const useDatabaseHealth = () => {
  const [health, setHealth] = useState<DatabaseHealth>({
    isHealthy: false,
    responseTime: null,
    lastChecked: null,
    errorCount: 0
  });

  const checkHealth = async () => {
    const startTime = Date.now();
    
    try {
      console.log('🏥 Starting database health check...');
      
      // Ultra-simple health check with aggressive timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      
      const { data, error } = await supabase
        .from('listings')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is OK
        throw error;
      }
      
      console.log(`✅ Database health check passed in ${responseTime}ms`);
      
      setHealth(prev => ({
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
        errorCount: Math.max(0, prev.errorCount - 1) // Gradually reduce error count on success
      }));
      
      return true;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Database health check failed after ${responseTime}ms:`, error);
      
      setHealth(prev => ({
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        errorCount: prev.errorCount + 1
      }));
      
      return false;
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Periodic health checks every 45 seconds (less frequent to reduce load)
    const interval = setInterval(checkHealth, 45000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    health,
    checkHealth
  };
};
