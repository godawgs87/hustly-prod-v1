import { useMemo } from 'react';
import type { Listing } from '@/types/Listing';
import type { InventoryFilters } from '@/hooks/useInventoryFilters';

export const useInventoryFiltering = (listings: Listing[], filters: InventoryFilters) => {
  const filteredListings = useMemo(() => {
    let filtered = listings;

    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title?.toLowerCase().includes(searchLower) ||
        listing.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.statusFilter && filters.statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status === filters.statusFilter);
    }

    if (filters.categoryFilter && filters.categoryFilter !== 'all') {
      filtered = filtered.filter(listing => listing.category === filters.categoryFilter);
    }

    return filtered;
  }, [listings, filters.searchTerm, filters.statusFilter, filters.categoryFilter]);

  return { filteredListings };
};