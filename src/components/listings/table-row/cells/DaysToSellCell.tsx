
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface DaysToSellCellProps {
  daysToSell: number | null;
}

const DaysToSellCell = ({ daysToSell }: DaysToSellCellProps) => {
  return (
    <TableCell className="text-center">
      {daysToSell || '-'}
    </TableCell>
  );
};

export default DaysToSellCell;
