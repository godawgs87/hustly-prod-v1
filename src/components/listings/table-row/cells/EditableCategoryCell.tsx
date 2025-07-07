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
    <>
      <EbayCategorySelector
        value={ebayCategory}
        onChange={handleCategoryChange}
        disabled={disabled}
      />
      {category && !ebayCategory && (
        <div className="mt-1 text-xs text-muted-foreground">
          Current: {category}
        </div>
      )}
    </>
  );
};

export default EditableCategoryCell;