import React, { useState, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useInventoryFilters } from '@/hooks/useInventoryFilters';
import { useInventoryActions } from './hooks/useInventoryActions';
import { useInventoryFiltering } from './hooks/useInventoryFiltering';
import OptimisticInventoryTableView from './OptimisticInventoryTableView';
import InventoryControls from './InventoryControls';
import InventoryStatsCards from './InventoryStatsCards';
import SimpleListingModal from './SimpleListingModal';
import InventoryStateRenderer from './components/InventoryStateRenderer';
import InventoryStatusNotifications from './components/InventoryStatusNotifications';
import TableEditDebugPanel from '@/components/debug/TableEditDebugPanel';

import type { Listing } from '@/types/Listing';

interface InventoryManagerProps {
  onCreateListing: () => void;
  onBack: () => void;
}

const InventoryManager = ({ onCreateListing, onBack }: InventoryManagerProps) => {
  const isMobile = useIsMobile();
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);

  // Use inventory store
  const {
    listings,
    selectedIds,
    isLoading,
    error,
    stats,
    usingFallback,
    fetchListings,
    refetch
  } = useInventoryStore();
  
  // Initialize filters and actions
  const filters = useInventoryFilters(listings);
  const actions = useInventoryActions();
  const { filteredListings } = useInventoryFiltering(listings, filters);

  // Load inventory on mount
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handlePreviewListing = useCallback((listing: Listing) => {
    setPreviewListing(listing);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewListing(null);
  }, []);

  const handleRetryWithFilters = useCallback(() => {
    filters.handleClearFilters();
    refetch();
  }, [filters, refetch]);

  // Handle different states
  if (isLoading && listings.length === 0) {
    return (
      <InventoryStateRenderer
        state="loading"
        isLoading={isLoading}
        error={error}
        usingFallback={usingFallback}
        onBack={onBack}
        onCreateListing={onCreateListing}
        onRetry={refetch}
        onRetryWithFilters={handleRetryWithFilters}
      />
    );
  }

  if (error && !usingFallback) {
    return (
      <InventoryStateRenderer
        state="error"
        isLoading={isLoading}
        error={error}
        usingFallback={usingFallback}
        onBack={onBack}
        onCreateListing={onCreateListing}
        onRetry={refetch}
        onRetryWithFilters={handleRetryWithFilters}
      />
    );
  }

  if (!isLoading && filteredListings.length === 0 && listings.length === 0 && !error) {
    return (
      <InventoryStateRenderer
        state="empty"
        isLoading={isLoading}
        error={error}
        usingFallback={usingFallback}
        onBack={onBack}
        onCreateListing={onCreateListing}
        onRetry={refetch}
        onRetryWithFilters={handleRetryWithFilters}
        filters={filters}
      />
    );
  }

  // Show main content
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Inventory Manager"
        showBack
        onBack={onBack}
      />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <InventoryStatusNotifications
          usingFallback={usingFallback}
          isLoading={isLoading}
          hasListings={listings.length > 0}
        />

        <InventoryStatsCards stats={stats} />

        <InventoryControls
          searchTerm={filters.searchTerm}
          statusFilter={filters.statusFilter}
          categoryFilter={filters.categoryFilter}
          categories={filters.categories}
          loading={isLoading}
          selectedCount={selectedIds.length}
          selectedItems={selectedIds}
          selectedListings={listings.filter(l => selectedIds.includes(l.id))}
          onSearchChange={filters.setSearchTerm}
          onStatusChange={filters.setStatusFilter}
          onCategoryChange={filters.setCategoryFilter}
          onClearFilters={filters.handleClearFilters}
          onRefresh={refetch}
          onCreateListing={onCreateListing}
          onSyncComplete={refetch}
          onBulkDelete={actions.handleBulkDelete}
        />

        <OptimisticInventoryTableView
          listings={filteredListings}
          selectedListings={selectedIds}
          onSelectListing={actions.handleSelectListing}
          onSelectAll={(checked) => actions.handleSelectAll(checked, listings)}
          onUpdateListing={actions.handleUpdateListing}
          onDeleteListing={actions.handleDeleteListing}
          onDuplicateListing={actions.handleDuplicateListing}
          onPreviewListing={handlePreviewListing}
          onSyncComplete={refetch}
        />
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="inventory"
          onNavigate={() => {}}
          showBack
          onBack={onBack}
          title="Inventory"
        />
      )}

      {previewListing && (
        <SimpleListingModal
          listing={previewListing}
          onClose={handleClosePreview}
          onSave={() => {
            handleClosePreview();
            refetch();
          }}
        />
      )}
      
      {/* Debug Panels - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <TableEditDebugPanel />
      )}
    </div>
  );
};

export default InventoryManager;