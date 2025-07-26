import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import EbayCategorySelector from './EbayCategorySelector';

interface EditableCategoryCellProps {
  category: string | null;
  ebayCategory?: string | null;
  ebayPath?: string | null;
  onSave: (ebayCategory: string, ebayPath: string) => void;
  disabled?: boolean;
}

const EditableCategoryCell = ({ 
  category, 
  ebayCategory, 
  ebayPath,
  onSave, 
  disabled 
}: EditableCategoryCellProps) => {
  const handleCategoryChange = (categoryId: string, categoryPath: string) => {
    console.log('🔄 EditableCategoryCell: Received category change', { categoryId, categoryPath });
    onSave(categoryId, categoryPath);
  };

  return (
    <div className="space-y-2">
      <EbayCategorySelector
        value={ebayCategory}
        onChange={handleCategoryChange}
        disabled={disabled}
      />
      {!ebayCategory && (
        <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
          ⚠️ Category required
        </div>
      )}
      {category && !ebayCategory && (
        <div className="text-xs text-muted-foreground">
          Current: {typeof category === 'object' && category && 'primary' in category 
            ? (category as any).primary 
            : category || 'Uncategorized'}
        </div>
      )}
    </div>
  );
};

export default EditableCategoryCell;