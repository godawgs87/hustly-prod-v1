
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { ListingData } from '@/types/CreateListing';

interface PriceAlertProps {
  listingData: ListingData;
}

const PriceAlert = ({ listingData }: PriceAlertProps) => {
  // Show positive price research message instead of warning
  if (!listingData.priceResearch) return null;

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <strong>Price Research:</strong> ${listingData.price} {listingData.priceResearch}
      </AlertDescription>
    </Alert>
  );
};

export default PriceAlert;
