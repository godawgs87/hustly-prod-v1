
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface ProfitCellProps {
  value: number | null | undefined;
  isPercentage?: boolean;
}

const ProfitCell = ({ value, isPercentage = false }: ProfitCellProps) => {
  if (value === null || value === undefined) {
    return <TableCell className="text-right font-medium">-</TableCell>;
  }

  const colorClass = value >= 0 ? 'text-green-600' : 'text-red-600';
  const displayValue = isPercentage ? `${value.toFixed(1)}%` : `$${value.toFixed(2)}`;

  return (
    <TableCell className="text-right font-medium">
      <span className={colorClass}>
        {displayValue}
      </span>
    </TableCell>
  );
};

export default ProfitCell;
