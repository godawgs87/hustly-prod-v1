
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ListingImagePreview from '@/components/ListingImagePreview';
import ProfitIndicator from '@/components/listing-card/ProfitIndicator';
import ListingCardHeader from '@/components/listing-card/ListingCardHeader';
import ListingCardBadges from '@/components/listing-card/ListingCardBadges';
import ConfirmationDialog from './ConfirmationDialog';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  condition: string | null;
  status: string | null;
  shipping_cost: number | null;
  photos: string[] | null;
  created_at: string;
  purchase_price?: number;
  net_profit?: number;
  profit_margin?: number;
  days_to_sell?: number;
  is_consignment?: boolean;
  consignment_percentage?: number;
  clothing_size?: string | null;
  shoe_size?: string | null;
  gender?: 'Men' | 'Women' | 'Kids' | 'Unisex' | null;
  age_group?: 'Adult' | 'Youth' | 'Toddler' | 'Baby' | null;
}

interface UnifiedListingCardProps {
  listing: Listing;
  isBulkMode: boolean;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onDuplicate?: (item: Listing) => void;
  showDuplicate?: boolean;
}

const UnifiedListingCard = ({
  listing,
  isBulkMode,
  isSelected,
  onSelect,
  onEdit,
  onPreview,
  onDelete,
  onDuplicate,
  showDuplicate = false
}: UnifiedListingCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDelete = () => setShowDeleteConfirm(true);
  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = () => setShowDuplicateConfirm(true);
  const confirmDuplicate = async () => {
    if (onDuplicate && !isDuplicating) {
      setIsDuplicating(true);
      try {
        await onDuplicate(listing);
      } finally {
        setIsDuplicating(false);
        setShowDuplicateConfirm(false);
      }
    }
  };

  return (
    <>
      <Card className="p-4 flex flex-col hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
        <ListingCardHeader
          title={listing.title}
          isBulkMode={isBulkMode}
          isSelected={isSelected}
          onSelect={onSelect}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          showDuplicate={showDuplicate}
        />

        <div className="mb-3 flex justify-center">
          <ListingImagePreview 
            photos={listing.photos} 
            title={listing.title}
            listingId={listing.id}
            className="w-32 h-32"
          />
        </div>

        <div className="space-y-3 flex-1">
          <ListingCardBadges
            category={listing.category}
            condition={listing.condition}
            status={listing.status}
            isConsignment={listing.is_consignment}
            createdAt={listing.created_at}
            daysToSell={listing.days_to_sell}
          />

          {/* Size Information */}
          {(listing.gender || listing.clothing_size || listing.shoe_size) && (
            <div className="flex flex-wrap gap-1">
              {listing.gender && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {listing.gender}
                </Badge>
              )}
              {listing.clothing_size && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  Size {listing.clothing_size}
                </Badge>
              )}
              {listing.shoe_size && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                  Size {listing.shoe_size}
                </Badge>
              )}
            </div>
          )}

          <ProfitIndicator
            purchasePrice={listing.purchase_price}
            price={listing.price}
            netProfit={listing.net_profit}
            profitMargin={listing.profit_margin}
          />

          <p className="text-xs text-gray-700 line-clamp-3">
            {listing.description?.substring(0, 80) || 'No description available'}...
          </p>

          <div className="space-y-1">
            <p className="text-sm font-bold text-green-600">${listing.price}</p>
            <p className="text-xs text-gray-500">
              Shipping: ${(listing.shipping_cost || 9.95).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Listing"
        description={`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {showDuplicate && (
        <ConfirmationDialog
          open={showDuplicateConfirm}
          onOpenChange={setShowDuplicateConfirm}
          title="Duplicate Listing"
          description={`Are you sure you want to create a copy of "${listing.title}"? This will create a new draft listing with the same details.`}
          confirmText={isDuplicating ? "Duplicating..." : "Duplicate"}
          onConfirm={confirmDuplicate}
        />
      )}
    </>
  );
};

export default UnifiedListingCard;
