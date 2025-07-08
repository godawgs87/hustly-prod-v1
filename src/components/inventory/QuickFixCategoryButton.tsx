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
    <div className="flex flex-col gap-2">
      <div className="text-xs text-orange-600 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        eBay category required
        {listing.category && (
          <span className="text-muted-foreground">
            (Current: {listing.category})
          </span>
        )}
      </div>
      <EbayCategorySelector
        value={listing.ebay_category_id}
        onChange={handleCategoryChange}
        disabled={isUpdating}
      />
      {isUpdating && (
        <div className="text-xs text-muted-foreground">Updating...</div>
      )}
    </div>
  );
};

export default QuickFixCategoryButton;