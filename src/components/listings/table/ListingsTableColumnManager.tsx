
import React from 'react';
import ColumnCustomizer from '@/components/ColumnCustomizer';

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

interface ListingsTableColumnManagerProps {
  visibleColumns: VisibleColumns;
  onColumnToggle: (column: keyof VisibleColumns) => void;
}

const ListingsTableColumnManager = ({
  visibleColumns,
  onColumnToggle
}: ListingsTableColumnManagerProps) => {
  return (
    <div className="p-4 border-b bg-gray-50">
      <ColumnCustomizer
        visibleColumns={visibleColumns}
        onColumnToggle={onColumnToggle}
      />
    </div>
  );
};

export default ListingsTableColumnManager;
