
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

const LoadingCell = () => {
  return (
    <TableCell className="text-sm">
      <div className="flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    </TableCell>
  );
};

export default LoadingCell;
