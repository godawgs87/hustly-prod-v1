
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
import ProfitCell from './cells/ProfitCell';
import DateCell from './cells/DateCell';
import ConsignmentStatusCell from './cells/ConsignmentStatusCell';
import SourceTypeCell from './cells/SourceTypeCell';
import SourceLocationCell from './cells/SourceLocationCell';
import DaysToSellCell from './cells/DaysToSellCell';
import PerformanceNotesCell from './cells/PerformanceNotesCell';
import LoadingCell from './cells/LoadingCell';
import { useOptimizedListingDetailsLoader } from '@/hooks/useOptimizedListingDetailsLoader';
import type { Listing } from '@/types/Listing';

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

interface ListingsTableRowDisplayProps {
  listing: Listing;
  index: number;
  visibleColumns: VisibleColumns;
}

const ListingsTableRowDisplay = ({ listing, index, visibleColumns }: ListingsTableRowDisplayProps) => {
  const { detailedListing, isLoading } = useOptimizedListingDetailsLoader(listing, visibleColumns);

  return (
    <>
      {visibleColumns.image && (
        <ImageCell 
          photos={detailedListing?.photos || listing.photos}
          title={listing.title}
          listingId={listing.id}
        />
      )}

      {visibleColumns.title && (
        <TitleCell 
          title={listing.title}
          description={detailedListing?.description || listing.description}
        />
      )}

      {visibleColumns.price && (
        <PriceCell price={listing.price} />
      )}

      {visibleColumns.status && (
        <BadgeCell value={listing.status} type="status" />
      )}

      {visibleColumns.category && (
        <CategoryCell 
          category={listing.category} 
          ebayCategory={listing.ebay_category_id}
          ebayPath={detailedListing?.ebay_category_path || null}
        />
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
          <MeasurementsCell measurements={detailedListing?.measurements || listing.measurements} />
        )
      )}

      {visibleColumns.keywords && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <KeywordsCell keywords={detailedListing?.keywords || listing.keywords} />
        )
      )}

      {visibleColumns.description && (
        isLoading ? (
          <LoadingCell />
        ) : (
          <DescriptionCell description={detailedListing?.description || listing.description} />
        )
      )}

      {visibleColumns.purchasePrice && (
        <ProfitCell value={listing.purchase_price} />
      )}

      {visibleColumns.purchaseDate && (
        <DateCell date={listing.purchase_date} />
      )}

      {visibleColumns.consignmentStatus && (
        <ConsignmentStatusCell 
          isConsignment={listing.is_consignment}
          consignmentPercentage={listing.consignment_percentage}
        />
      )}

      {visibleColumns.sourceType && (
        <SourceTypeCell sourceType={listing.source_type} />
      )}

      {visibleColumns.sourceLocation && (
        <SourceLocationCell sourceLocation={listing.source_location} />
      )}

      {visibleColumns.costBasis && (
        <ProfitCell value={listing.cost_basis} />
      )}

      {visibleColumns.netProfit && (
        <ProfitCell value={listing.net_profit} />
      )}

      {visibleColumns.profitMargin && (
        <ProfitCell value={listing.profit_margin} isPercentage />
      )}

      {visibleColumns.daysToSell && (
        <DaysToSellCell daysToSell={listing.days_to_sell} />
      )}

      {visibleColumns.performanceNotes && (
        <PerformanceNotesCell performanceNotes={listing.performance_notes} />
      )}
    </>
  );
};

export default ListingsTableRowDisplay;
