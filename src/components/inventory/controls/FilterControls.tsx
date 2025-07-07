import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterControlsProps {
  statusFilter: string;
  categoryFilter: string;
  categories: string[];
  selectedCount: number;
  hasActiveFilters: boolean;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
}

const FilterControls = ({
  statusFilter,
  categoryFilter,
  categories,
  selectedCount,
  hasActiveFilters,
  onStatusChange,
  onCategoryChange,
  onClearFilters
}: FilterControlsProps) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="sold">Sold</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map(category => (
            <SelectItem key={category} value={category}>{category}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button onClick={onClearFilters} variant="ghost" size="sm">
          Clear Filters
        </Button>
      )}

      {selectedCount > 0 && (
        <Badge variant="secondary" className="ml-auto">
          {selectedCount} selected
        </Badge>
      )}
    </div>
  );
};

export default FilterControls;