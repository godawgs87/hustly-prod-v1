import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import InventorySyncManager from '../InventorySyncManager';
import type { Listing } from '@/types/Listing';

interface BulkActionBarProps {
  selectedCount: number;
  selectedItems: string[];
  selectedListings: Listing[];
  onBulkDelete?: (selectedIds: string[]) => void;
  onSyncComplete: () => void;
}

const BulkActionBar = ({
  selectedCount,
  selectedItems,
  selectedListings,
  onBulkDelete,
  onSyncComplete
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <>
      {onBulkDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onBulkDelete(selectedItems)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <InventorySyncManager 
        selectedItems={selectedItems}
        selectedListings={selectedListings}
        onSyncComplete={onSyncComplete}
      />
    </>
  );
};

export default BulkActionBar;