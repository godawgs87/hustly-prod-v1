import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Sparkles, Check } from 'lucide-react';
import { CategoryMappingService, Platform, PlatformCategoryField } from '@/services/CategoryMappingService';
import EditableCategoryCell from '@/components/listings/table-row/cells/EditableCategoryCell';

interface PlatformCategorySectionProps {
  platform: Platform;
  platformName: string;
  internalCategory?: string;
  currentCategoryId?: string;
  currentCategoryPath?: string;
  onCategoryChange: (categoryId: string, categoryPath: string) => void;
  isRequired?: boolean;
}

const PlatformCategorySection = ({
  platform,
  platformName,
  internalCategory,
  currentCategoryId,
  currentCategoryPath,
  onCategoryChange,
  isRequired = false
}: PlatformCategorySectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<PlatformCategoryField | null>(null);
  const [isAutoApplied, setIsAutoApplied] = useState(false);

  useEffect(() => {
    if (internalCategory && !currentCategoryId) {
      loadSuggestions();
    }
  }, [internalCategory, currentCategoryId]);

  // Auto-apply suggestions with high confidence
  useEffect(() => {
    if (suggestedCategory && !currentCategoryId && !isAutoApplied) {
      // Auto-apply the suggestion immediately
      handleCategoryChange(suggestedCategory.categoryId, suggestedCategory.categoryPath || '');
      setIsAutoApplied(true);
    }
  }, [suggestedCategory, currentCategoryId, isAutoApplied]);

  const loadSuggestions = async () => {
    if (!internalCategory) return;

    const suggestions = await CategoryMappingService.getSuggestedCategories(internalCategory);
    const platformSuggestion = suggestions[platform];
    
    if (platformSuggestion) {
      setSuggestedCategory(platformSuggestion);
    }
  };

  const handleCategoryChange = async (categoryId: string, categoryPath: string) => {
    onCategoryChange(categoryId, categoryPath);
    
    // Save the mapping for future suggestions
    if (internalCategory) {
      await CategoryMappingService.saveCategoryMapping(
        internalCategory,
        platform,
        categoryId,
        categoryPath
      );
    }
    
    setSuggestedCategory(null);
    setIsAutoApplied(false);
  };

  const handleApplySuggestion = () => {
    if (suggestedCategory) {
      handleCategoryChange(suggestedCategory.categoryId, suggestedCategory.categoryPath || '');
      setIsAutoApplied(true);
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ebay': return '🛒';
      case 'mercari': return '🟠';
      case 'poshmark': return '👗';
      case 'depop': return '🎨';
      case 'facebook': return '👥';
      default: return '📦';
    }
  };

  const hasCategory = currentCategoryId && currentCategoryId.length > 0;
  const hasSuggestion = suggestedCategory && !hasCategory;
  const isMinimized = hasCategory && isAutoApplied;

  return (
    <Card className={`border-l-4 border-l-primary/20 ${isMinimized ? 'shadow-sm' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className={`cursor-pointer hover:bg-muted/50 transition-colors ${isMinimized ? 'py-3' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`${isMinimized ? 'text-base' : 'text-lg'}`}>{getPlatformIcon()}</span>
                <div>
                  <CardTitle className={`${isMinimized ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
                    {platformName} Category
                    {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {hasCategory && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {isAutoApplied ? '✨ Auto-Set' : 'Set'}
                      </Badge>
                    )}
                    {hasSuggestion && (
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Suggested
                      </Badge>
                    )}
                  </CardTitle>
                  {hasCategory && currentCategoryPath && (
                    <p className={`${isMinimized ? 'text-xs' : 'text-sm'} text-muted-foreground truncate max-w-md`}>
                      {currentCategoryPath}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSuggestion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplySuggestion();
                    }}
                    className="text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                )}
                {hasCategory && isMinimized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(true);
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Change
                  </Button>
                )}
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {hasSuggestion && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      Smart Suggestion
                    </p>
                    <p className="text-xs text-blue-700 truncate">
                      {suggestedCategory.categoryPath || suggestedCategory.categoryId}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplySuggestion}
                    className="text-xs border-blue-300 hover:bg-blue-100"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Use This
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {platformName} Category
                </label>
                
                {platform === 'ebay' ? (
                  <EditableCategoryCell
                    category={internalCategory || ''}
                    ebayCategory={currentCategoryId}
                    ebayPath={currentCategoryPath}
                    onSave={handleCategoryChange}
                  />
                ) : (
                  <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
                    {platformName} category selector coming soon
                    <br />
                    <span className="text-xs">
                      Will integrate with {platformName} API for category selection
                    </span>
                  </div>
                )}
              </div>

              {isAutoApplied && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  <Check className="w-4 h-4 inline mr-1" />
                  Category suggestion applied successfully
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PlatformCategorySection;