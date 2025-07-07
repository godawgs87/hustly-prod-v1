
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SourceTypeCellProps {
  sourceType: string | null;
}

const SourceTypeCell = ({ sourceType }: SourceTypeCellProps) => {
  return (
    <TableCell className="text-sm">
      {sourceType ? (
        <Badge variant="outline">{sourceType.replace('_', ' ')}</Badge>
      ) : '-'}
    </TableCell>
  );
};

export default SourceTypeCell;
