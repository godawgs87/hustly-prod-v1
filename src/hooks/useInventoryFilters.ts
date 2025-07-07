
import { useState, useMemo } from 'react';
import type { Listing } from '@/types/Listing';

export interface InventoryFilters {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  categories: string[];
  handleClearFilters: () => void;
}

export const useInventoryFilters = (listings: Listing[]): InventoryFilters => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(listings.map(l => l.category).filter(Boolean))];
    return uniqueCategories as string[];
  }, [listings]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    categories,
    handleClearFilters
  };
};
