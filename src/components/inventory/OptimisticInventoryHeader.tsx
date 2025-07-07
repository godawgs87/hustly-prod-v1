
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Grid, List, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStandardToast } from '@/hooks/useStandardToast';
import ListingsTableColumnManager from '../listings/table/ListingsTableColumnManager';

interface OptimisticInventoryHeaderProps {
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  selectedCount: number;
  showBulkDeleteDialog: boolean;
  onShowBulkDeleteDialog: (show: boolean) => void;
  onBulkDelete: () => void;
  visibleColumns: any;
  onColumnToggle: (column: any) => void;
}

const OptimisticInventoryHeader = ({
  viewMode,
  onViewModeChange,
  selectedCount,
  showBulkDeleteDialog,
  onShowBulkDeleteDialog,
  onBulkDelete,
  visibleColumns,
  onColumnToggle
}: OptimisticInventoryHeaderProps) => {
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const toast = useStandardToast();

  const handleSyncCategories = async () => {
    setIsSyncingCategories(true);
    try {
      const { data, error } = await supabase.functions.invoke('ebay-category-sync');
      
      if (error) {
        throw error;
      }
      
      toast.success(`Successfully synced ${data.synced_count} eBay categories`);
    } catch (error) {
      console.error('Category sync error:', error);
      toast.error('Failed to sync eBay categories');
    } finally {
      setIsSyncingCategories(false);
    }
  };
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
      <div className="flex items-center gap-4">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as 'table' | 'grid')}>
          <ToggleGroupItem value="table" aria-label="Table view">
            <List className="w-4 h-4 mr-2" />
            Table
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </ToggleGroupItem>
        </ToggleGroup>

        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSyncCategories}
          disabled={isSyncingCategories}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCategories ? 'animate-spin' : ''}`} />
          Sync Categories
        </Button>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedCount} selected
            </span>
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={onShowBulkDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Listings</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedCount} listing{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete {selectedCount} Listing{selectedCount !== 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {viewMode === 'table' && (
        <ListingsTableColumnManager
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle}
        />
      )}
    </div>
  );
};

export default OptimisticInventoryHeader;
