
import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, Eye, MoreVertical, Copy, Archive } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  condition: string | null;
  status: string | null;
  shipping_cost: number | null;
  measurements: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  } | null;
  keywords: string[] | null;
  photos: string[] | null;
  price_research: string | null;
  created_at: string;
  purchase_price?: number | null;
  purchase_date?: string | null;
  is_consignment?: boolean;
  consignment_percentage?: number | null;
  consignor_name?: string | null;
  consignor_contact?: string | null;
  source_type?: string | null;
  source_location?: string | null;
  cost_basis?: number | null;
  fees_paid?: number | null;
  net_profit?: number | null;
  profit_margin?: number | null;
  listed_date?: string | null;
  sold_date?: string | null;
  sold_price?: number | null;
  days_to_sell?: number | null;
  performance_notes?: string | null;
}

interface ListingsTableRowActionsProps {
  listing: Listing;
  onEdit: () => void;
  onDelete: () => void;
  onPreview?: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  onDuplicate?: (listing: Listing) => Promise<Listing | null>;
}

const ListingsTableRowActions = ({ 
  listing, 
  onEdit, 
  onDelete, 
  onPreview,
  onEditListing,
  onDuplicate 
}: ListingsTableRowActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const handleDeleteConfirm = () => {
    console.log('Delete confirmed for listing:', listing.id);
    onDelete();
    setShowDeleteDialog(false);
  };

  const handleDuplicateClick = () => {
    console.log('Duplicate clicked for listing:', listing.id, 'onDuplicate available:', !!onDuplicate);
    if (onDuplicate && !isDuplicating) {
      setShowDuplicateDialog(true);
    } else if (isDuplicating) {
      console.log('Duplicate already in progress, ignoring click');
    } else {
      console.error('onDuplicate function not available');
    }
  };

  const handleDuplicateConfirm = async () => {
    console.log('Duplicate confirmed for listing:', listing.id);
    if (onDuplicate && !isDuplicating) {
      setIsDuplicating(true);
      try {
        console.log('Starting duplicate operation with data:', {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          dataTypes: {
            price: typeof listing.price,
            measurements: typeof listing.measurements,
            keywords: Array.isArray(listing.keywords),
            photos: Array.isArray(listing.photos)
          }
        });
        
        const result = await onDuplicate(listing);
        console.log('Duplicate operation result:', result);
        
        if (result !== null) {
          console.log('Duplicate operation completed successfully');
        } else {
          console.log('Duplicate operation failed - null result returned');
        }
      } catch (error) {
        console.error('Error during duplicate operation:', error);
      } finally {
        setIsDuplicating(false);
        setShowDuplicateDialog(false);
      }
    }
  };

  return (
    <TableCell className="sticky right-0 bg-white z-10 border-l">
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onPreview && (
              <DropdownMenuItem onClick={() => onPreview(listing)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
            )}
            {onEditListing && (
              <DropdownMenuItem onClick={() => onEditListing(listing)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem 
                onClick={handleDuplicateClick}
                disabled={isDuplicating}
              >
                <Copy className="mr-2 h-4 w-4" />
                {isDuplicating ? 'Duplicating...' : 'Duplicate'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => console.log('Archive listing')}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listing.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a copy of "{listing.title}"? This will create a new draft listing with the same details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDuplicating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDuplicateConfirm}
              disabled={isDuplicating}
            >
              {isDuplicating ? "Duplicating..." : "Duplicate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableCell>
  );
};

export default ListingsTableRowActions;
