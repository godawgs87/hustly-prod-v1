
import { useEffect, useState, useMemo } from 'react';
import { useImprovedListingDetailsCache } from '@/hooks/useImprovedListingDetailsCache';

interface VisibleColumns {
  image: boolean;
  measurements: boolean;
  keywords: boolean;
  description: boolean;
  purchasePrice: boolean;
  netProfit: boolean;
  profitMargin: boolean;
  purchaseDate: boolean;
  consignmentStatus: boolean;
  sourceType: boolean;
  sourceLocation: boolean;
  costBasis: boolean;
  daysToSell: boolean;
  performanceNotes: boolean;
}

export const useOptimizedListingDetailsLoader = (
  listing: any,
  visibleColumns: VisibleColumns
) => {
  const { loadDetails, isLoadingDetails } = useImprovedListingDetailsCache();
  const [detailedListing, setDetailedListing] = useState<any>(listing);

  // Memoize whether we need details to prevent unnecessary re-renders
  const needsDetails = useMemo(() => {
    return visibleColumns.image || 
           visibleColumns.measurements || 
           visibleColumns.keywords || 
           visibleColumns.description ||
           visibleColumns.purchasePrice ||
           visibleColumns.netProfit ||
           visibleColumns.profitMargin ||
           visibleColumns.purchaseDate ||
           visibleColumns.consignmentStatus ||
           visibleColumns.sourceType ||
           visibleColumns.sourceLocation ||
           visibleColumns.costBasis ||
           visibleColumns.daysToSell ||
           visibleColumns.performanceNotes;
  }, [visibleColumns]);

  useEffect(() => {
    if (!needsDetails) {
      setDetailedListing(listing);
      return;
    }

    const loadListingDetails = async () => {
      try {
        const details = await loadDetails(listing.id);
        if (details) {
          setDetailedListing({ ...listing, ...details });
        } else {
          setDetailedListing(listing);
        }
      } catch (error) {
        console.error('Failed to load listing details:', error);
        setDetailedListing(listing);
      }
    };

    loadListingDetails();
  }, [listing.id, needsDetails]); // Removed loadDetails from dependencies to prevent infinite loop

  const isLoading = isLoadingDetails(listing.id);

  return { detailedListing, isLoading };
};
