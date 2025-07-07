
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Trash2, Copy } from 'lucide-react';

interface ListingCardHeaderProps {
  title: string;
  isBulkMode: boolean;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  showDuplicate?: boolean;
}

const ListingCardHeader = ({
  title,
  isBulkMode,
  isSelected,
  onSelect,
  onEdit,
  onPreview,
  onDelete,
  onDuplicate,
  showDuplicate = false
}: ListingCardHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {isBulkMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
            {title}
          </h3>
        </div>
      </div>
      {!isBulkMode && (
        <div className="flex space-x-1 flex-shrink-0 ml-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 hover:bg-blue-50 hover:border-blue-200 transition-colors duration-200" 
            onClick={onEdit}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 hover:bg-green-50 hover:border-green-200 transition-colors duration-200" 
            onClick={onPreview}
          >
            <Eye className="w-3 h-3" />
          </Button>
          {showDuplicate && (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 hover:bg-purple-50 hover:border-purple-200 transition-colors duration-200" 
              onClick={onDuplicate}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-8 w-8 hover:bg-red-600 transition-colors duration-200" 
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ListingCardHeader;
