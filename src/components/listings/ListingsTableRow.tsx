
import React, { useState } from 'react';
import { TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell } from '@/components/ui/table';
import ListingsTableRowDisplay from './table-row/ListingsTableRowDisplay';
import ListingsTableRowEdit from './table-row/ListingsTableRowEdit';
import ListingsTableRowActions from './table-row/ListingsTableRowActions';
import type { Listing } from '@/types/Listing';

interface VisibleColumns {
  image: boolean;
  title: boolean;
  price: boolean;
  status: boolean;
  category: boolean;
  condition: boolean;
  shipping: boolean;
  measurements: boolean;
  keywords: boolean;
  description: boolean;
  purchasePrice: boolean;
  purchaseDate: boolean;
  consignmentStatus: boolean;
  sourceType: boolean;
  sourceLocation: boolean;
  costBasis: boolean;
  netProfit: boolean;
  profitMargin: boolean;
  daysToSell: boolean;
  performanceNotes: boolean;
  sku: boolean;
}

interface ListingsTableRowProps {
  listing: Listing;
  index: number;
  isSelected: boolean;
  visibleColumns: VisibleColumns;
  onSelectListing: (listingId: string, checked: boolean) => void;
  onUpdateListing: (listingId: string, updates: Partial<Listing>) => Promise<boolean>;
  onDeleteListing: (listingId: string) => void;
  onPreviewListing?: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  onDuplicateListing?: (listing: Listing) => Promise<Listing | null>;
}

const ListingsTableRow = ({
  listing,
  index,
  isSelected,
  visibleColumns,
  onSelectListing,
  onUpdateListing,
  onDeleteListing,
  onPreviewListing,
  onEditListing,
  onDuplicateListing
}: ListingsTableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (updates: Partial<Listing>) => {
    try {
      const success = await onUpdateListing(listing.id, updates);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save listing:', error);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      onDeleteListing(listing.id);
    }
  };

  return (
    <TableRow className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
      <TableCell className="sticky left-0 bg-inherit z-10 border-r">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectListing(listing.id, checked as boolean)}
        />
      </TableCell>

      {isEditing ? (
        <ListingsTableRowEdit
          listing={listing}
          visibleColumns={visibleColumns}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <ListingsTableRowDisplay
            listing={listing}
            index={index}
            visibleColumns={visibleColumns}
          />
          <ListingsTableRowActions
            listing={listing}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
            onPreview={onPreviewListing}
            onEditListing={onEditListing}
            onDuplicate={onDuplicateListing}
          />
        </>
      )}
    </TableRow>
  );
};

export default ListingsTableRow;
