
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

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

interface ListingsTableHeaderProps {
  visibleColumns: VisibleColumns;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
}

const ListingsTableHeader = ({
  visibleColumns,
  selectedCount,
  totalCount,
  onSelectAll
}: ListingsTableHeaderProps) => {
  return (
    <TableHeader className="bg-gray-50">
      <TableRow className="border-b-2">
        <TableHead className="w-12 sticky left-0 bg-gray-50 z-20 border-r">
          <Checkbox
            checked={selectedCount === totalCount && totalCount > 0}
            onCheckedChange={onSelectAll}
          />
        </TableHead>
        
        {/* Core columns */}
        {visibleColumns.image && (
          <TableHead className="w-16 sticky left-12 bg-gray-50 z-20 border-r">Image</TableHead>
        )}
        {visibleColumns.title && (
          <TableHead className="min-w-[250px] sticky left-28 bg-gray-50 z-20 border-r font-semibold">
            Product Details
          </TableHead>
        )}
        {visibleColumns.price && (
          <TableHead className="w-[120px] font-semibold">Price</TableHead>
        )}
        {visibleColumns.status && (
          <TableHead className="w-[100px] font-semibold">Status</TableHead>
        )}
        {visibleColumns.category && (
          <TableHead className="w-[120px] font-semibold">Category</TableHead>
        )}
        {visibleColumns.condition && (
          <TableHead className="w-[100px] font-semibold">Condition</TableHead>
        )}
        {visibleColumns.shipping && (
          <TableHead className="w-[100px]">Shipping</TableHead>
        )}
        {visibleColumns.measurements && (
          <TableHead className="w-[150px]">Measurements</TableHead>
        )}
        {visibleColumns.keywords && (
          <TableHead className="w-[150px]">Keywords</TableHead>
        )}
        {visibleColumns.description && (
          <TableHead className="w-[200px]">Description</TableHead>
        )}
        
        {/* Financial columns */}
        {visibleColumns.purchasePrice && (
          <TableHead className="w-[120px] font-semibold">Purchase Price</TableHead>
        )}
        {visibleColumns.purchaseDate && (
          <TableHead className="w-[120px]">Purchase Date</TableHead>
        )}
        {visibleColumns.consignmentStatus && (
          <TableHead className="w-[120px]">Consignment</TableHead>
        )}
        {visibleColumns.sourceType && (
          <TableHead className="w-[120px]">Source Type</TableHead>
        )}
        {visibleColumns.sourceLocation && (
          <TableHead className="w-[150px]">Source Location</TableHead>
        )}
        {visibleColumns.costBasis && (
          <TableHead className="w-[120px] font-semibold">Cost Basis</TableHead>
        )}
        {visibleColumns.netProfit && (
          <TableHead className="w-[120px] font-semibold">Net Profit</TableHead>
        )}
        {visibleColumns.profitMargin && (
          <TableHead className="w-[120px] font-semibold">Profit Margin</TableHead>
        )}
        {visibleColumns.daysToSell && (
          <TableHead className="w-[120px]">Days to Sell</TableHead>
        )}
        {visibleColumns.performanceNotes && (
          <TableHead className="w-[200px]">Performance Notes</TableHead>
        )}
        
        <TableHead className="w-[140px] sticky right-0 bg-gray-50 z-20 border-l font-semibold">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default ListingsTableHeader;
