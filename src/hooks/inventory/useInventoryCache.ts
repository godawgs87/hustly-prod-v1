import { useCallback } from 'react';
import type { Listing } from '@/types/Listing';

// Cache configuration
const CACHE_KEY = 'hustly_inventory_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1024 * 1024; // 1MB limit

interface MinimalListing {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
  created_at: string;
}

interface CacheEntry {
  data: MinimalListing[];
  timestamp: number;
  userId: string;
}

export const useInventoryCache = () => {
  // Storage management utilities
  const clearExpiredCache = useCallback(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('hustly_') || key.includes('supabase.auth.')) {
          try {
            const item = localStorage.getItem(key);
            if (item && item.length > 50000) { // Remove large items
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }, []);

  // Get cached data with expiry check
  const getCachedData = useCallback((): Listing[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const entry: CacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY_MS;
      
      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      // Convert minimal data back to full Listing objects
      return entry.data.map(item => ({
        id: item.id,
        user_id: '',
        title: item.title,
        price: item.price,
        status: item.status || 'draft',
        category: item.category || 'Electronics',
        condition: 'good',
        description: null,
        measurements: {},
        keywords: null,
        photos: null,
        shipping_cost: 9.95,
        purchase_price: null,
        cost_basis: null,
        fees_paid: 0,
        net_profit: null,
        profit_margin: null,
        source_location: null,
        source_type: null,
        performance_notes: null,
        created_at: item.created_at,
        updated_at: item.created_at,
        price_research: null,
        purchase_date: null,
        listed_date: null,
        sold_date: null,
        sold_price: null,
        days_to_sell: null,
        is_consignment: false,
        consignment_percentage: null,
        consignor_name: null,
        consignor_contact: null,
        category_id: null,
        gender: null,
        age_group: null,
        clothing_size: null,
        shoe_size: null,
        sku: null,
        auto_generate_sku: null,
        sku_prefix: null,
        ebay_category_id: null,
        ebay_category_path: null
      }));
    } catch {
      clearExpiredCache(); // Clean up on error
      return null;
    }
  }, [clearExpiredCache]);

  // Set cached data with size management
  const setCachedData = useCallback((data: Listing[], userId: string) => {
    try {
      // Store only minimal data to reduce storage usage
      const minimalData: MinimalListing[] = data.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        status: item.status || 'draft',
        category: item.category || 'Electronics',
        created_at: item.created_at
      }));

      const entry: CacheEntry = {
        data: minimalData,
        timestamp: Date.now(),
        userId
      };

      const cacheData = JSON.stringify(entry);
      
      // Check if data is too large
      if (cacheData.length > MAX_CACHE_SIZE) {
        console.warn('Cache data too large, storing reduced set');
        const reducedData = minimalData.slice(0, Math.floor(minimalData.length / 2));
        const reducedEntry: CacheEntry = {
          data: reducedData,
          timestamp: Date.now(),
          userId
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(reducedEntry));
      } else {
        localStorage.setItem(CACHE_KEY, cacheData);
      }
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        clearExpiredCache();
        // Try storing without cache if quota exceeded
        console.warn('Storage quota exceeded, cleared cache');
      } else {
        console.warn('Failed to cache data:', error);
      }
    }
  }, [clearExpiredCache]);

  return {
    getCachedData,
    setCachedData,
    clearExpiredCache
  };
};