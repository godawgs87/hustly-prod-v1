import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import ListingImagePreview from '@/components/ListingImagePreview';
import EditableTableCell from './EditableTableCell';
import EditableCategoryCell from '@/components/listings/table-row/cells/EditableCategoryCell';
import PlatformBadge from '../PlatformBadge';
import type { Listing } from '@/types/Listing';

interface TableRowCellsProps {
  listing: Listing;
  photosToDisplay: string[] | null;
  isSelected: boolean;
  isEditing: boolean;
  editData: Partial<Listing>;
  visibleColumns: any;
  onSelectListing: (listingId: string, checked: boolean) => void;
  updateEditData: (field: keyof Listing, value: any) => void;
}

const TableRowCells = ({
  listing,
  photosToDisplay,
  isSelected,
  isEditing,
  editData,
  visibleColumns,
  onSelectListing,
  updateEditData
}: TableRowCellsProps) => {
  return (
    <>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectListing(listing.id, !!checked)}
        />
      </TableCell>
      
      {visibleColumns.image && (
        <TableCell>
          <ListingImagePreview 
            photos={photosToDisplay} 
            title={listing.title}
            className="w-12 h-12"
          />
        </TableCell>
      )}
      
      {visibleColumns.title && (
        <TableCell className="max-w-xs">
          {isEditing ? (
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => updateEditData('title', e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate">{listing.title}</span>
              <PlatformBadge platform={listing.platform} />
            </div>
          )}
        </TableCell>
      )}
      
      {visibleColumns.price && (
        <EditableTableCell
          field="price"
          value={isEditing ? editData.price : listing.price}
          isEditing={isEditing}
          onUpdate={updateEditData}
        />
      )}
      
      {visibleColumns.status && (
        <EditableTableCell
          field="status"
          value={isEditing ? editData.status : listing.status}
          isEditing={isEditing}
          onUpdate={updateEditData}
          listing={listing}
        />
      )}
      
      {visibleColumns.category && (
        <TableCell className="min-w-32">
          {isEditing ? (
            <EditableCategoryCell
              category={editData.category || listing.category}
              ebayCategory={editData.ebay_category_id || listing.ebay_category_id}
              ebayPath={listing.ebay_category_path}
              onSave={(categoryId, categoryPath) => {
                console.log('🔄 TableRowCells: Category selected', { categoryId, categoryPath });
                updateEditData('ebay_category_id' as keyof Listing, categoryId);
                updateEditData('ebay_category_path' as keyof Listing, categoryPath);
                // Also update the legacy category field for backward compatibility
                const firstCategory = categoryPath.split(' > ')[0] || '';
                updateEditData('category' as keyof Listing, firstCategory);
                console.log('✅ TableRowCells: Updated fields', { 
                  ebay_category_id: categoryId, 
                  ebay_category_path: categoryPath,
                  category: firstCategory 
                });
              }}
            />
           ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm">
                {(() => {
                  if (listing.ebay_category_path) {
                    // Show only first level: "Category"
                    const pathParts = listing.ebay_category_path.split(' > ');
                    return pathParts[0] || '';
                  }
                  return listing.category || '-';
                })()}
              </span>

            </div>
          )}
        </TableCell>
      )}

      
      {visibleColumns.condition && (
        <EditableTableCell
          field="condition"
          value={isEditing ? editData.condition : listing.condition}
          isEditing={isEditing}
          onUpdate={updateEditData}
        />
      )}
      
      {visibleColumns.shipping && (
        <EditableTableCell
          field="shipping_cost"
          value={isEditing ? editData.shipping_cost : listing.shipping_cost}
          isEditing={isEditing}
          onUpdate={updateEditData}
        />
      )}
    </>
  );
};

export default TableRowCells;