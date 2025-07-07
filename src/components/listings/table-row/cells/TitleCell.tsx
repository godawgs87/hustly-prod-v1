
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface TitleCellProps {
  title: string;
  description: string | null;
  listingId?: string;
}

const TitleCell = ({ title, description, listingId }: TitleCellProps) => {
  // Handle missing or empty titles
  const displayTitle = title && title.trim() !== '' 
    ? title 
    : `Untitled Item ${listingId ? listingId.substring(0, 8) : 'Unknown'}`;
  
  const isMissingTitle = !title || title.trim() === '';

  return (
    <TableCell className="sticky left-28 bg-white z-10 border-r min-w-[250px]">
      <div>
        <div className={`font-medium text-sm line-clamp-2 ${isMissingTitle ? 'text-gray-500 italic' : ''}`}>
          {displayTitle}
          {isMissingTitle && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
              NO TITLE
            </span>
          )}
        </div>
        {description && (
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
            {description.length > 100 
              ? `${description.substring(0, 100)}...` 
              : description}
          </div>
        )}
        {isMissingTitle && (
          <div className="text-xs text-red-600 mt-1">
            ⚠️ Missing title in database
          </div>
        )}
      </div>
    </TableCell>
  );
};

export default TitleCell;
