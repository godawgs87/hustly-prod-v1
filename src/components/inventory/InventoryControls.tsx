
import React from 'react';
import InventoryControlsContainer from './controls/InventoryControlsContainer';
import type { Listing } from '@/types/Listing';

interface InventoryControlsProps {
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

const InventoryControls = (props: InventoryControlsProps) => {
  return <InventoryControlsContainer {...props} />;
};

export default InventoryControls;
