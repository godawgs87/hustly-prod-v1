
export interface UnifiedInventoryOptions {
  searchTerm?: string;
  statusFilter?: string;
  categoryFilter?: string;
  limit?: number;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeItems: number;
  draftItems: number;
}
