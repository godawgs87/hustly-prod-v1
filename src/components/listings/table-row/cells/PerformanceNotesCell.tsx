
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface PerformanceNotesCellProps {
  performanceNotes: string | null;
}

const PerformanceNotesCell = ({ performanceNotes }: PerformanceNotesCellProps) => {
  return (
    <TableCell className="max-w-[200px]">
      <div className="text-sm text-gray-600 line-clamp-2">
        {performanceNotes || '-'}
      </div>
    </TableCell>
  );
};

export default PerformanceNotesCell;
