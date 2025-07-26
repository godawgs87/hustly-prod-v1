import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAsyncOperation } from './useAsyncOperation';

interface UseSupabaseQueryOptions {
  autoFetch?: boolean;
  dependencies?: any[];
  successMessage?: string;
  errorMessage?: string;
  showToasts?: boolean;
}

interface QueryFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

export const useSupabaseQuery = <T = any>(
  table: string,
  select: string = '*',
  options: UseSupabaseQueryOptions = {}
) => {
  const [data, setData] = useState<T[] | null>(null);
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [orderBy, setOrderBy] = useState<{ column: string; ascending?: boolean } | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  const {
    autoFetch = true,
    dependencies = [],
    successMessage,
    errorMessage = 'Failed to fetch data',
    showToasts = false
  } = options;

  const { loading, error, execute } = useAsyncOperation({
    successMessage,
    errorMessage,
    showSuccessToast: showToasts,
    showErrorToast: showToasts
  });

  const buildQuery = useCallback(() => {
    let query = supabase.from(table).select(select);

    // Apply filters
    filters.forEach(filter => {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.column, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.column, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.column, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.column, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.column, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.column, filter.value);
          break;
        case 'like':
          query = query.like(filter.column, filter.value);
          break;
        case 'ilike':
          query = query.ilike(filter.column, filter.value);
          break;
        case 'in':
          query = query.in(filter.column, filter.value);
          break;
        case 'is':
          query = query.is(filter.column, filter.value);
          break;
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }, [table, select, filters, orderBy, limit]);

  const fetchData = useCallback(async () => {
    const result = await execute(async () => {
      const query = buildQuery();
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    });

    if (result !== null) {
      setData(result);
    }

    return result;
  }, [execute, buildQuery]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  const addFilter = useCallback((column: string, operator: QueryFilter['operator'], value: any) => {
    setFilters(prev => [...prev.filter(f => f.column !== column), { column, operator, value }]);
  }, []);

  const removeFilter = useCallback((column: string) => {
    setFilters(prev => prev.filter(f => f.column !== column));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const setOrder = useCallback((column: string, ascending: boolean = true) => {
    setOrderBy({ column, ascending });
  }, []);

  const setQueryLimit = useCallback((newLimit: number | null) => {
    setLimit(newLimit);
  }, []);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
    fetchData,
    addFilter,
    removeFilter,
    clearFilters,
    setOrder,
    setLimit: setQueryLimit,
    filters,
    orderBy,
    limit
  };
};

// Specialized hook for single record queries
export const useSupabaseRecord = <T = any>(
  table: string,
  id: string | number | null,
  select: string = '*',
  options: Omit<UseSupabaseQueryOptions, 'autoFetch'> & { autoFetch?: boolean } = {}
) => {
  const { autoFetch = !!id, ...restOptions } = options;
  
  const query = useSupabaseQuery<T>(table, select, {
    ...restOptions,
    autoFetch: false,
    dependencies: [id]
  });

  const fetchRecord = useCallback(async () => {
    if (!id) return null;
    
    query.clearFilters();
    query.addFilter('id', 'eq', id);
    const result = await query.fetchData();
    return result?.[0] || null;
  }, [id, query]);

  useEffect(() => {
    if (autoFetch && id) {
      fetchRecord();
    }
  }, [autoFetch, id, fetchRecord]);

  return {
    ...query,
    data: query.data?.[0] || null,
    fetchRecord
  };
};