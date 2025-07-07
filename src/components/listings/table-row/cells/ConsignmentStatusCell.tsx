
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ConsignmentStatusCellProps {
  isConsignment?: boolean;
  consignmentPercentage?: number | null;
}

const ConsignmentStatusCell = ({ isConsignment, consignmentPercentage }: ConsignmentStatusCellProps) => {
  return (
    <TableCell>
      {isConsignment ? (
        <div className="text-sm">
          <Badge className="bg-purple-100 text-purple-800">Consignment</Badge>
          {consignmentPercentage && (
            <div className="text-xs text-gray-500 mt-1">
              {consignmentPercentage}%
            </div>
          )}
        </div>
      ) : (
        <Badge className="bg-blue-100 text-blue-800">Owned</Badge>
      )}
    </TableCell>
  );
};

export default ConsignmentStatusCell;
