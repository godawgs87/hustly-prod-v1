
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface DateCellProps {
  date: string | null;
}

const DateCell = ({ date }: DateCellProps) => {
  return (
    <TableCell className="text-sm">
      {date || '-'}
    </TableCell>
  );
};

export default DateCell;
