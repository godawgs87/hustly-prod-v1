import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import UnifiedListingCard from '@/components/UnifiedListingCard';
import type { Listing } from '@/types/Listing';

interface OptimizedInventoryTableProps {
  listings: Listing[];
  loading: boolean;
  onEdit: (listing: Listing) => void;
  onSelect: (listingId: string, checked: boolean) => void;
  selectedListings: Set<string>;
  visibleColumns: any;
}

const OptimizedInventoryTable = ({
  listings,
  loading,
  onEdit,
  onSelect,
  selectedListings,
  visibleColumns
}: OptimizedInventoryTableProps) => {
  // Show skeleton loading for better perceived performance
  if (loading && listings.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No listings found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {listings.map((listing) => (
        <UnifiedListingCard
          key={listing.id}
          listing={listing}
          isBulkMode={false}
          onEdit={() => onEdit(listing)}
          onSelect={(checked) => onSelect(listing.id, checked)}
          onPreview={() => {}} // No-op for now
          onDelete={() => {}} // No-op for now
          isSelected={selectedListings.has(listing.id)}
        />
      ))}
    </div>
  );
};

export default OptimizedInventoryTable;