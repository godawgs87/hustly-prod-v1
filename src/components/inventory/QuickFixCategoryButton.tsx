import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EbayCategorySelector from '@/components/listings/table-row/cells/EbayCategorySelector';
import { CategoryMappingService } from '@/services/CategoryMappingService';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types/Listing';

interface QuickFixCategoryButtonProps {
  listing: Listing;
  onUpdate: (listingId: string, updates: Partial<Listing>) => Promise<boolean>;
}

const QuickFixCategoryButton = ({ listing, onUpdate }: QuickFixCategoryButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleCategoryChange = async (categoryId: string, categoryPath: string) => {
    setIsUpdating(true);
    try {
      const success = await onUpdate(listing.id, {
        ebay_category_id: categoryId,
        ebay_category_path: categoryPath
      });

      if (success) {
        // Save the mapping for future use
        if (listing.category) {
          await CategoryMappingService.saveCategoryMapping(
            listing.category,
            'ebay',
            categoryId,
            categoryPath
          );
        }

        toast({
          title: "eBay Category Set",
          description: "Listing is now ready for eBay sync",
        });
        
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to update eBay category:', error);
      toast({
        title: "Update Failed",
        description: "Could not set eBay category",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show if eBay category is already set
  if (listing.ebay_category_id) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
          <Settings className="w-4 h-4 mr-1" />
          Set eBay Category
          <Badge variant="destructive" className="ml-2 text-xs">
            Required
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Set eBay Category
          </DialogTitle>
          <DialogDescription>
            This listing needs an eBay-specific category to sync to eBay.
            {listing.category && (
              <span className="block mt-1 text-sm">
                Current general category: <strong>{listing.category}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <EbayCategorySelector
            value={listing.ebay_category_id}
            onChange={handleCategoryChange}
            disabled={isUpdating}
          />
          {isUpdating && (
            <div className="text-sm text-gray-500">Updating...</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickFixCategoryButton;