
import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CategoryCellProps {
  category: string | null;
  categoryId?: string | null;
  ebayCategory?: string | null;
  ebayPath?: string | null;
}

const CategoryCell = ({ category, categoryId, ebayCategory, ebayPath }: CategoryCellProps) => {
  const getDisplayContent = () => {
    // Prioritize eBay category if available
    if (ebayPath) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">
            {ebayPath}
          </div>
          <Badge variant="secondary" className="text-xs">
            eBay
          </Badge>
        </div>
      );
    }

    // Fallback to internal category
    if (category) {
      return (
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            {category}
          </div>
          <Badge variant="outline" className="text-xs">
            Internal
          </Badge>
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        No category
      </div>
    );
  };

  return (
    <TableCell className="min-w-48">
      {getDisplayContent()}
    </TableCell>
  );
};

export default CategoryCell;
