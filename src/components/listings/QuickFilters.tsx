
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

interface QuickFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  conditionFilter: string;
  onConditionChange: (condition: string) => void;
  priceRange: string;
  onPriceRangeChange: (range: string) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const QuickFilters = ({
  categories,
  selectedCategory,
  onCategoryChange,
  conditionFilter,
  onConditionChange,
  priceRange,
  onPriceRangeChange,
  activeFiltersCount,
  onClearFilters
}: QuickFiltersProps) => {
  const conditions = ['All', 'New', 'Like New', 'Used', 'Fair', 'Poor'];
  const priceRanges = [
    { label: 'All Prices', value: 'all' },
    { label: 'Under $25', value: 'under-25' },
    { label: '$25 - $100', value: '25-100' },
    { label: '$100 - $500', value: '100-500' },
    { label: 'Over $500', value: 'over-500' }
  ];

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Quick Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Categories */}
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">Category</div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange('all')}
              className="text-xs h-7"
            >
              All
            </Button>
            {categories.slice(0, 6).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(category)}
                className="text-xs h-7"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">Condition</div>
          <div className="flex flex-wrap gap-1">
            {conditions.map((condition) => (
              <Button
                key={condition}
                variant={conditionFilter === condition.toLowerCase() ? 'default' : 'outline'}
                size="sm"
                onClick={() => onConditionChange(condition.toLowerCase())}
                className="text-xs h-7"
              >
                {condition}
              </Button>
            ))}
          </div>
        </div>

        {/* Price Ranges */}
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">Price Range</div>
          <div className="flex flex-wrap gap-1">
            {priceRanges.map((range) => (
              <Button
                key={range.value}
                variant={priceRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPriceRangeChange(range.value)}
                className="text-xs h-7"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFilters;
