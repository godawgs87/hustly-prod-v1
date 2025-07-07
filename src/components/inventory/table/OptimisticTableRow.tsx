
import React from 'react';
import { TableRow } from '@/components/ui/table';
import TableRowCells from './TableRowCells';
import TableCellActions from './TableCellActions';
import { useTableRowEdit } from './hooks/useTableRowEdit';
import type { Listing } from '@/types/Listing';

interface OptimisticTableRowProps {
  listing: Listing;
  detailedListing: Listing;
  isSelected: boolean;
  isUpdating: boolean;
  visibleColumns: any;
  onSelectListing: (listingId: string, checked: boolean) => void;
  onUpdateListing?: (listingId: string, updates: Partial<Listing>) => Promise<boolean>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onPreviewListing?: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  onDuplicateListing?: (listing: Listing) => Promise<Listing | null>;
  onSyncComplete?: () => void;
}

const OptimisticTableRow = ({
  listing,
  detailedListing,
  isSelected,
  isUpdating,
  visibleColumns,
  onSelectListing,
  onUpdateListing,
  onDeleteListing,
  onPreviewListing,
  onEditListing,
  onDuplicateListing,
  onSyncComplete
}: OptimisticTableRowProps) => {
  const {
    isEditing,
    editData,
    handleEdit,
    handleSave,
    handleCancel,
    updateEditData
  } = useTableRowEdit(listing, onUpdateListing);

  const handleOptimisticDelete = async () => {
    try {
      await onDeleteListing(listing.id);
    } catch (error) {
      throw error;
    }
  };

  return (
    <TableRow 
      className={`${isUpdating ? 'opacity-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
    >
      <TableRowCells
        listing={listing}
        photosToDisplay={listing.photos}
        isSelected={isSelected}
        isEditing={isEditing}
        editData={editData}
        visibleColumns={visibleColumns}
        onSelectListing={onSelectListing}
        updateEditData={updateEditData}
      />
      
      <TableCellActions
        listing={listing}
        isEditing={isEditing}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleOptimisticDelete}
        onPreview={onPreviewListing}
        onDuplicate={onDuplicateListing}
        onSyncComplete={onSyncComplete}
        onUpdateListing={onUpdateListing}
      />
    </TableRow>
  );
};

export default OptimisticTableRow;
