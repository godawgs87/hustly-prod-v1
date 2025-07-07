
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface PriceCellProps {
  price: number;
}

const PriceCell = ({ price }: PriceCellProps) => {
  return (
    <TableCell className="text-right font-medium">
      ${price?.toFixed(2) || '0.00'}
    </TableCell>
  );
};

export default PriceCell;
