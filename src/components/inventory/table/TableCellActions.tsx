import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Copy, MoreVertical, Check, X, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EbaySyncButton from '../EbaySyncButton';
import InventoryDebugActions from '../InventoryDebugActions';

import type { Listing } from '@/types/Listing';

interface TableCellActionsProps {
  listing: Listing;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onPreview?: (listing: Listing) => void;
  onDuplicate?: (listing: Listing) => Promise<Listing | null>;
  onSyncComplete?: () => void;
  onUpdateListing?: (listingId: string, updates: Partial<Listing>) => Promise<boolean>;
}

const TableCellActions = ({
  listing,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onPreview,
  onDuplicate,
  onSyncComplete,
  onUpdateListing
}: TableCellActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };
  return (
    <TableCell>
      {isEditing ? (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            onClick={() => {
              console.log('💾 Save button clicked in TableCellActions');
              onSave();
            }}
            className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
          >
            <Check className="w-4 h-4 text-white" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
              {onPreview && (
                <DropdownMenuItem onClick={() => onPreview(listing)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(listing)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <div className="px-2 py-1.5">
                  <EbaySyncButton listing={listing} onSyncComplete={onSyncComplete} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="px-2 py-1.5">
                  <InventoryDebugActions listing={listing} onRefresh={onSyncComplete} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeleteClick}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listing.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableCell>
  );
};

export default TableCellActions;