import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EbayService } from '@/services/api/ebayService';
import type { Listing } from '@/types/Listing';

interface ExtendedListing extends Listing {
  ebay_item_id?: string;
  platform?: string;
  sku?: string;
}

interface DeleteListingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ExtendedListing;
  onSuccess?: () => void;
}

export function DeleteListingDialog({ listing, isOpen, onClose, onSuccess }: DeleteListingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFromEbay, setDeleteFromEbay] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete from eBay if requested and listing exists there
      if (deleteFromEbay && listing.ebay_item_id) {
        try {
          console.log('🗑️ Deleting from eBay:', listing.ebay_item_id);
          
          // Call eBay API to end the listing
          const response = await supabase.functions.invoke('ebay-end-listing', {
            body: { 
              itemId: listing.ebay_item_id,
              reason: 'NotAvailable' // Valid reasons: Incorrect, LostOrBroken, NotAvailable, OtherListingError, SellToHighBidder, Sold
            }
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to delete from eBay');
          }

          toast({
            title: "Deleted from eBay",
            description: "The listing has been removed from eBay",
          });
        } catch (ebayError) {
          console.error('Failed to delete from eBay:', ebayError);
          
          // Ask user if they want to continue with local deletion
          const continueDelete = window.confirm(
            'Failed to delete from eBay. Do you want to continue and delete from Hustly only?'
          );
          
          if (!continueDelete) {
            setIsDeleting(false);
            return;
          }
        }
      }

      // Delete from Hustly database
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);

      if (error) {
        throw error;
      }

      const message = deleteFromEbay && listing.ebay_item_id 
        ? "The listing has been deleted from Hustly and eBay"
        : "The listing has been deleted from Hustly";
      toast({
        title: "Success",
        description: message,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete listing",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Delete Listing
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this listing?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-1">{listing.title || 'Untitled'}</h4>
            <p className="text-sm text-gray-600">
              Price: ${listing.price?.toFixed(2) || '0.00'}
            </p>
            {listing.sku && (
              <p className="text-sm text-gray-600">SKU: {listing.sku}</p>
            )}
          </div>

          {listing.ebay_item_id && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="delete-from-ebay"
                checked={deleteFromEbay}
                onCheckedChange={(checked) => setDeleteFromEbay(checked as boolean)}
                disabled={isDeleting}
              />
              <div className="space-y-1">
                <label
                  htmlFor="delete-from-ebay"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Also delete from eBay
                </label>
                <p className="text-sm text-gray-600">
                  This will end the listing on eBay (Item ID: {listing.ebay_item_id})
                </p>
              </div>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The listing will be permanently deleted
              {deleteFromEbay && listing.ebay_item_id && ' from both Hustly and eBay'}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
