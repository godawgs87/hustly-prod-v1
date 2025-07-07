
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface KeywordsCellProps {
  keywords: string[] | null;
}

const KeywordsCell = ({ keywords }: KeywordsCellProps) => {
  return (
    <TableCell>
      {keywords && keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {keywords.slice(0, 3).map((keyword, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {keywords.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{keywords.length - 3}
            </Badge>
          )}
        </div>
      ) : '-'}
    </TableCell>
  );
};

export default KeywordsCell;
