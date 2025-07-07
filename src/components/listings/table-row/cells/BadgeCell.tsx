
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BadgeCellProps {
  value: string | null;
  type: 'status' | 'condition';
}

const BadgeCell = ({ value, type }: BadgeCellProps) => {
  const getStatusBadge = (status: string | null) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      sold: 'bg-blue-100 text-blue-800',
      archived: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.draft}>
        {status || 'draft'}
      </Badge>
    );
  };

  const getConditionBadge = (condition: string | null) => {
    const conditionColors = {
      'New': 'bg-green-100 text-green-800',
      'Like New': 'bg-blue-100 text-blue-800',
      'Used': 'bg-yellow-100 text-yellow-800',
      'Fair': 'bg-orange-100 text-orange-800',
      'Poor': 'bg-red-100 text-red-800',
      'For Parts': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={conditionColors[condition as keyof typeof conditionColors] || 'bg-gray-100 text-gray-800'}>
        {condition || 'Unknown'}
      </Badge>
    );
  };

  return (
    <TableCell>
      {type === 'status' ? getStatusBadge(value) : getConditionBadge(value)}
    </TableCell>
  );
};

export default BadgeCell;
