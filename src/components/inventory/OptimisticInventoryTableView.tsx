import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import OptimisticTableRow from './table/OptimisticTableRow';
import type { Listing } from '@/types/Listing';

interface OptimisticInventoryTableViewProps {
  listings: Listing[];
  selectedListings: string[];
  onSelectListing: (listingId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onUpdateListing?: (listingId: string, updates: Partial<Listing>) => Promise<boolean>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onPreviewListing?: (listing: Listing) => void;
  onDuplicateListing?: (listing: Listing) => Promise<Listing | null>;
  onSyncComplete?: () => void;
}

const OptimisticInventoryTableView = ({
  listings,
  selectedListings,
  onSelectListing,
  onSelectAll,
  onDeleteListing,
  onUpdateListing,
  onPreviewListing,
  onDuplicateListing,
  onSyncComplete
}: OptimisticInventoryTableViewProps) => {
  // Simple visible columns - only show what we need
  const visibleColumns = {
    image: true,
    title: true,
    price: true,
    status: true,
    category: true,
    condition: true,
    shipping: true
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedListings.length === listings.length && listings.length > 0}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Price</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="w-32">Category</TableHead>
            <TableHead className="w-24">Condition</TableHead>
            <TableHead className="w-24">Shipping</TableHead>
            <TableHead className="w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => {
            const isSelected = selectedListings.includes(listing.id);
            
            return (
              <OptimisticTableRow
                key={listing.id}
                listing={listing}
                detailedListing={listing}
                isSelected={isSelected}
                isUpdating={false}
                visibleColumns={visibleColumns}
                onSelectListing={onSelectListing}
                onUpdateListing={onUpdateListing}
                onDeleteListing={onDeleteListing}
                onPreviewListing={onPreviewListing}
                onEditListing={onPreviewListing}
                onDuplicateListing={onDuplicateListing}
                onSyncComplete={onSyncComplete}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OptimisticInventoryTableView;