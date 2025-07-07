import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useStandardToast } from './useStandardToast';

interface UseSupabaseQueryOptions {
  dependencies?: any[];
  enabled?: boolean;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
}

/**
 * Reusable hook for Supabase queries with loading states and error handling
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UseSupabaseQueryOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { error: showError } = useStandardToast();

  const { 
    dependencies = [], 
    enabled = true, 
    onError, 
    showErrorToast = true 
  } = options;

  const executeQuery = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await queryFn();
      
      if (result.error) {
        throw new Error(result.error.message || 'Query failed');
      }
      
      setData(result.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      logger.error('Supabase query failed', error);
      
      if (onError) {
        onError(error);
      } else if (showErrorToast) {
        showError('Query Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeQuery();
  }, dependencies);

  const refetch = () => {
    executeQuery();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}

/**
 * Specialized hook for getting current user session
 */
export function useCurrentUser() {
  return useSupabaseQuery(
    () => supabase.auth.getUser(),
    { dependencies: [] }
  );
}

/**
 * Specialized hook for getting user's marketplace accounts
 */
export function useMarketplaceAccounts(userId?: string) {
  return useSupabaseQuery(
    async () => {
      if (!userId) return { data: null, error: null };
      
      return await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', userId);
    },
    { 
      dependencies: [userId],
      enabled: !!userId 
    }
  );
}

/**
 * Specialized hook for getting user's listings
 */
export function useUserListings(userId?: string) {
  return useSupabaseQuery(
    async () => {
      if (!userId) return { data: null, error: null };
      
      return await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    },
    { 
      dependencies: [userId],
      enabled: !!userId 
    }
  );
}