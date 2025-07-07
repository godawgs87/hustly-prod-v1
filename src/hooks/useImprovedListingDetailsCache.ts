
import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

interface CacheEntry {
  data: Partial<Listing>;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries
const CLEANUP_INTERVAL = 60 * 1000; // Clean up every minute

export const useImprovedListingDetailsCache = () => {
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [detailsCache, setDetailsCache] = useState<Map<string, CacheEntry>>(new Map());
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    maxSize: MAX_CACHE_SIZE
  });
  
  const cleanupTimer = useRef<NodeJS.Timeout | null>(null);

  // Start cleanup timer on first use
  const startCleanupTimer = useCallback(() => {
    if (!cleanupTimer.current) {
      cleanupTimer.current = setInterval(() => {
        setDetailsCache(prev => {
          const now = Date.now();
          const newCache = new Map<string, CacheEntry>();
          let evictionCount = 0;

          // Remove expired entries
          for (const [key, entry] of prev) {
            if (now - entry.timestamp < CACHE_TTL) {
              newCache.set(key, entry);
            } else {
              evictionCount++;
            }
          }

          // If still over limit, remove least recently used entries
          if (newCache.size > MAX_CACHE_SIZE) {
            const entries = Array.from(newCache.entries())
              .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed);
            
            const toKeep = entries.slice(0, MAX_CACHE_SIZE);
            evictionCount += entries.length - toKeep.length;
            
            newCache.clear();
            toKeep.forEach(([key, value]) => newCache.set(key, value));
          }

          if (evictionCount > 0) {
            setCacheStats(prev => ({
              ...prev,
              evictions: prev.evictions + evictionCount,
              size: newCache.size
            }));
          }

          return newCache;
        });
      }, CLEANUP_INTERVAL);
    }
  }, []);

  const fetchListingDetails = useCallback(async (listingId: string): Promise<{
    details: Listing | null;
    error?: string;
  }> => {
    try {
      console.log('🔍 Fetching details for listing:', listingId);
      
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) {
        console.error('❌ Details query error:', error);
        return { details: null, error: error.message };
      }

      const transformedDetails: Listing = {
        ...data,
        price: Number(data.price) || 0,
        measurements: data.measurements && typeof data.measurements === 'object' 
          ? data.measurements as { length?: string; width?: string; height?: string; weight?: string; }
          : {},
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        photos: Array.isArray(data.photos) ? data.photos : [],
        shipping_cost: data.shipping_cost !== null ? Number(data.shipping_cost) : null,
        gender: data.gender as "Men" | "Women" | "Kids" | "Unisex" | null,
      } as Listing;

      console.log('✅ Successfully fetched listing details');
      return { details: transformedDetails };

    } catch (error: any) {
      console.error('💥 Exception in fetchListingDetails:', error);
      return { details: null, error: error.message };
    }
  }, []);

  const getCachedDetails = useCallback((listingId: string): Partial<Listing> | null => {
    startCleanupTimer();
    
    const cached = detailsCache.get(listingId);
    if (!cached) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    const now = Date.now();
    
    // Check if cache entry is still valid
    if (now - cached.timestamp > CACHE_TTL) {
      setDetailsCache(prev => {
        const next = new Map(prev);
        next.delete(listingId);
        return next;
      });
      setCacheStats(prev => ({ 
        ...prev, 
        misses: prev.misses + 1,
        evictions: prev.evictions + 1,
        size: prev.size - 1
      }));
      return null;
    }

    // Update access statistics
    setDetailsCache(prev => {
      const next = new Map(prev);
      const entry = next.get(listingId);
      if (entry) {
        next.set(listingId, {
          ...entry,
          accessCount: entry.accessCount + 1,
          lastAccessed: now
        });
      }
      return next;
    });

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    console.log('📋 Cache hit for listing:', listingId);
    return cached.data;
  }, [detailsCache, startCleanupTimer]);

  const setCachedDetails = useCallback((listingId: string, details: Partial<Listing>) => {
    const now = Date.now();
    
    setDetailsCache(prev => {
      const next = new Map(prev);
      
      // If we're at capacity and this is a new entry, remove least recently used
      if (!prev.has(listingId) && prev.size >= MAX_CACHE_SIZE) {
        const entries = Array.from(prev.entries())
          .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        if (entries.length > 0) {
          next.delete(entries[0][0]);
          setCacheStats(prev => ({ 
            ...prev, 
            evictions: prev.evictions + 1,
            size: prev.size - 1
          }));
        }
      }
      
      next.set(listingId, {
        data: details,
        timestamp: now,
        accessCount: 1,
        lastAccessed: now
      });
      
      return next;
    });

    setCacheStats(prev => ({ 
      ...prev, 
      size: Math.min(prev.size + (detailsCache.has(listingId) ? 0 : 1), MAX_CACHE_SIZE)
    }));
  }, [detailsCache]);

  const loadDetails = useCallback(async (listingId: string): Promise<Partial<Listing> | null> => {
    console.log('🔍 loadDetails called for:', listingId);

    // Check cache first
    const cached = getCachedDetails(listingId);
    if (cached) {
      return cached;
    }

    // Skip if already loading
    if (loadingDetails.has(listingId)) {
      console.log('⏳ Details already loading for:', listingId);
      return null;
    }

    console.log('🚀 Starting load for:', listingId);
    setLoadingDetails(prev => new Set(prev).add(listingId));

    try {
      const { details, error } = await fetchListingDetails(listingId);
      
      if (error) {
        console.error('❌ Failed to load details for:', listingId, error);
        return null;
      }

      if (details) {
        console.log('✅ Successfully loaded details for:', listingId);
        setCachedDetails(listingId, details);
        return details;
      }

      return null;
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }
  }, [getCachedDetails, setCachedDetails, loadingDetails, fetchListingDetails]);

  const isLoadingDetails = useCallback((listingId: string) => {
    return loadingDetails.has(listingId);
  }, [loadingDetails]);

  const hasDetails = useCallback((listingId: string) => {
    const cached = detailsCache.get(listingId);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_TTL;
  }, [detailsCache]);

  const clearCache = useCallback(() => {
    console.log('🧹 Clearing details cache');
    setDetailsCache(new Map());
    setLoadingDetails(new Set());
    setCacheStats({
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: MAX_CACHE_SIZE
    });
    
    if (cleanupTimer.current) {
      clearInterval(cleanupTimer.current);
      cleanupTimer.current = null;
    }
  }, []);

  const prefetchDetails = useCallback(async (listingIds: string[]) => {
    const uncachedIds = listingIds.filter(id => !hasDetails(id) && !loadingDetails.has(id));
    
    if (uncachedIds.length === 0) return;
    
    console.log('🔄 Prefetching details for:', uncachedIds.length, 'listings');
    
    // Batch load multiple listings
    const promises = uncachedIds.slice(0, 10).map(id => loadDetails(id)); // Limit concurrent requests
    await Promise.allSettled(promises);
  }, [hasDetails, loadingDetails, loadDetails]);

  return {
    loadDetails,
    isLoadingDetails,
    hasDetails,
    clearCache,
    prefetchDetails,
    cacheStats
  };
};
