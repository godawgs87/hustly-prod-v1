
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface DescriptionCellProps {
  description: string | null;
}

const DescriptionCell = ({ description }: DescriptionCellProps) => {
  return (
    <TableCell className="max-w-[200px]">
      <div className="text-sm text-gray-600 line-clamp-3">
        {description || '-'}
      </div>
    </TableCell>
  );
};

export default DescriptionCell;
