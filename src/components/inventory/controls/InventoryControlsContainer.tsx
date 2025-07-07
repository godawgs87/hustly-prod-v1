import React from 'react';
import { Card } from '@/components/ui/card';
import SearchBar from './SearchBar';
import FilterControls from './FilterControls';
import BulkActionBar from './BulkActionBar';
import InventoryActionsBar from './InventoryActionsBar';
import type { Listing } from '@/types/Listing';

interface InventoryControlsContainerProps {
  searchTerm: string;
  statusFilter: string;
  categoryFilter: string;
  categories: string[];
  loading: boolean;
  selectedCount: number;
  selectedItems: string[];
  selectedListings: Listing[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onCreateListing: () => void;
  onSyncComplete: () => void;
  onBulkDelete?: (selectedIds: string[]) => void;
}

const InventoryControlsContainer = ({
  searchTerm,
  statusFilter,
  categoryFilter,
  categories,
  loading,
  selectedCount,
  selectedItems,
  selectedListings,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onClearFilters,
  onRefresh,
  onCreateListing,
  onSyncComplete,
  onBulkDelete
}: InventoryControlsContainerProps) => {
  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all');

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <SearchBar 
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
        
        <div className="flex gap-2 flex-wrap">
          <BulkActionBar
            selectedCount={selectedCount}
            selectedItems={selectedItems}
            selectedListings={selectedListings}
            onBulkDelete={onBulkDelete}
            onSyncComplete={onSyncComplete}
          />
          
          <InventoryActionsBar
            loading={loading}
            onRefresh={onRefresh}
            onCreateListing={onCreateListing}
          />
        </div>
      </div>

      <FilterControls
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        categories={categories}
        selectedCount={selectedCount}
        hasActiveFilters={hasActiveFilters}
        onStatusChange={onStatusChange}
        onCategoryChange={onCategoryChange}
        onClearFilters={onClearFilters}
      />
    </Card>
  );
};

export default InventoryControlsContainer;