
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface SourceLocationCellProps {
  sourceLocation: string | null;
}

const SourceLocationCell = ({ sourceLocation }: SourceLocationCellProps) => {
  return (
    <TableCell className="text-sm max-w-[150px] truncate">
      {sourceLocation || '-'}
    </TableCell>
  );
};

export default SourceLocationCell;
