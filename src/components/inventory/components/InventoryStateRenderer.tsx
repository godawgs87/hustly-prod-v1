import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import InventoryLoadingState from '../InventoryLoadingState';
import InventoryErrorSection from '../InventoryErrorSection';
import InventoryEmptyState from '../InventoryEmptyState';
import InventoryControls from '../InventoryControls';
import type { InventoryFilters } from '@/hooks/useInventoryFilters';

interface InventoryStateRendererProps {
  state: 'loading' | 'error' | 'empty';
  isLoading: boolean;
  error: string | null;
  usingFallback: boolean;
  onBack: () => void;
  onCreateListing: () => void;
  onRetry: () => void;
  onRetryWithFilters: () => void;
  filters?: InventoryFilters;
}

const InventoryStateRenderer = ({
  state,
  isLoading,
  error,
  usingFallback,
  onBack,
  onCreateListing,
  onRetry,
  onRetryWithFilters,
  filters
}: InventoryStateRendererProps) => {
  const isMobile = useIsMobile();

  const renderMobileNav = () => (
    isMobile && (
      <UnifiedMobileNavigation
        currentView="inventory"
        onNavigate={() => {}}
        showBack
        onBack={onBack}
        title="Inventory"
      />
    )
  );

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return <InventoryLoadingState />;
      
      case 'error':
        return (
          <InventoryErrorSection
            error={error}
            onRetry={onRetry}
            onClearFilters={onRetryWithFilters}
          />
        );
      
      case 'empty':
        return (
          <>
            {filters && (
              <InventoryControls
                searchTerm={filters.searchTerm}
                statusFilter={filters.statusFilter}
                categoryFilter={filters.categoryFilter}
                categories={filters.categories}
                loading={false}
                selectedCount={0}
                selectedItems={[]}
                selectedListings={[]}
                onSearchChange={filters.setSearchTerm}
                onStatusChange={filters.setStatusFilter}
                onCategoryChange={filters.setCategoryFilter}
                onClearFilters={filters.handleClearFilters}
                onRefresh={onRetry}
                onCreateListing={onCreateListing}
                onSyncComplete={onRetry}
              />
            )}
            <InventoryEmptyState onCreateListing={onCreateListing} />
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Inventory Manager"
        showBack
        onBack={onBack}
      />
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {renderContent()}
      </div>
      {renderMobileNav()}
    </div>
  );
};

export default InventoryStateRenderer;