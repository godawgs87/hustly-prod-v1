
import React from 'react';
import ImageCell from './cells/ImageCell';
import TitleCell from './cells/TitleCell';
import PriceCell from './cells/PriceCell';
import BadgeCell from './cells/BadgeCell';
import CategoryCell from './cells/CategoryCell';
import ShippingCell from './cells/ShippingCell';
import MeasurementsCell from './cells/MeasurementsCell';
import KeywordsCell from './cells/KeywordsCell';
import DescriptionCell from './cells/DescriptionCell';
import DateCell from './cells/DateCell';
import ConsignmentStatusCell from './cells/ConsignmentStatusCell';
import SourceTypeCell from './cells/SourceTypeCell';
import SourceLocationCell from './cells/SourceLocationCell';
import ProfitCell from './cells/ProfitCell';
import DaysToSellCell from './cells/DaysToSellCell';
import PerformanceNotesCell from './cells/PerformanceNotesCell';
import LoadingCell from './cells/LoadingCell';
import { useOptimizedListingDetailsLoader } from '@/hooks/useOptimizedListingDetailsLoader';

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

interface VisibleColumns {
  image: boolean;
  title: boolean;
  price: boolean;
  status: boolean;
  category: boolean;
  condition: boolean;
  shipping: boolean;
  measurements: boolean;
  keywords: boolean;
  description: boolean;
  purchasePrice: boolean;
  purchaseDate: boolean;
  consignmentStatus: boolean;
  sourceType: boolean;
  sourceLocation: boolean;
  costBasis: boolean;
  netProfit: boolean;
  profitMargin: boolean;
  daysToSell: boolean;
  performanceNotes: boolean;
}

interface OptimizedListingsTableRowDisplayProps {
  listing: Listing;
  index: number;
  visibleColumns: VisibleColumns;
}

const OptimizedListingsTableRowDisplay = ({ listing, index, visibleColumns }: OptimizedListingsTableRowDisplayProps) => {
  const { detailedListing, isLoading } = useOptimizedListingDetailsLoader(listing, visibleColumns);

  return (
    <>
      {visibleColumns.image && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ImageCell 
            photos={detailedListing.photos || listing.photos}
            title={listing.title}
            listingId={listing.id}
          />
        )
      )}

      {visibleColumns.title && (
        <TitleCell 
          title={listing.title}
          description={detailedListing.description || listing.description}
        />
      )}

      {visibleColumns.price && (
        <PriceCell price={listing.price} />
      )}

      {visibleColumns.status && (
        <BadgeCell value={listing.status} type="status" />
      )}

      {visibleColumns.category && (
        <CategoryCell category={listing.category} />
      )}

      {visibleColumns.condition && (
        <BadgeCell value={listing.condition} type="condition" />
      )}

      {visibleColumns.shipping && (
        <ShippingCell shippingCost={listing.shipping_cost} />
      )}

      {visibleColumns.measurements && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <MeasurementsCell measurements={detailedListing.measurements || listing.measurements} />
        )
      )}

      {visibleColumns.keywords && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <KeywordsCell keywords={detailedListing.keywords || listing.keywords} />
        )
      )}

      {visibleColumns.description && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <DescriptionCell description={detailedListing.description || listing.description} />
        )
      )}

      {visibleColumns.purchasePrice && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ProfitCell value={detailedListing.purchase_price || listing.purchase_price} />
        )
      )}

      {visibleColumns.purchaseDate && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <DateCell date={detailedListing.purchase_date || listing.purchase_date} />
        )
      )}

      {visibleColumns.consignmentStatus && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ConsignmentStatusCell 
            isConsignment={detailedListing.is_consignment || listing.is_consignment}
            consignmentPercentage={detailedListing.consignment_percentage || listing.consignment_percentage}
          />
        )
      )}

      {visibleColumns.sourceType && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <SourceTypeCell sourceType={detailedListing.source_type || listing.source_type} />
        )
      )}

      {visibleColumns.sourceLocation && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <SourceLocationCell sourceLocation={detailedListing.source_location || listing.source_location} />
        )
      )}

      {visibleColumns.costBasis && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ProfitCell value={detailedListing.cost_basis || listing.cost_basis} />
        )
      )}

      {visibleColumns.netProfit && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ProfitCell value={detailedListing.net_profit || listing.net_profit} />
        )
      )}

      {visibleColumns.profitMargin && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <ProfitCell value={detailedListing.profit_margin || listing.profit_margin} isPercentage />
        )
      )}

      {visibleColumns.daysToSell && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <DaysToSellCell daysToSell={detailedListing.days_to_sell || listing.days_to_sell} />
        )
      )}

      {visibleColumns.performanceNotes && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <PerformanceNotesCell performanceNotes={detailedListing.performance_notes || listing.performance_notes} />
        )
      )}
    </>
  );
};

export default OptimizedListingsTableRowDisplay;
