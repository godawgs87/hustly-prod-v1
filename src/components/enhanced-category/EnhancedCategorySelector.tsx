import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

interface EbayCategory {
  ebay_category_id: string;
  category_name: string;
  parent_ebay_category_id: string | null;
  leaf_category: boolean;
  requires_item_specifics?: Json;
  suggested_item_specifics?: Json;
}

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  fullPath: string;
  reasoning?: string;
}

interface EnhancedCategorySelectorProps {
  value?: string | null;
  categoryPath?: string | null;
  onChange: (categoryId: string, categoryPath: string, category?: EbayCategory) => void;
  disabled?: boolean;
  showSuggestions?: boolean;
  itemTitle?: string;
  itemDescription?: string;
  compact?: boolean;
  placeholder?: string;
}

const EnhancedCategorySelector = ({ 
  value, 
  categoryPath,
  onChange, 
  disabled, 
  showSuggestions = true,
  itemTitle,
  itemDescription,
  compact = false,
  placeholder = "Select eBay Category"
}: EnhancedCategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Fetch categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Build selected path when value changes
  useEffect(() => {
    if (value && categories.length > 0) {
      buildSelectedPath(value);
    }
  }, [value, categories]);

  // Generate suggestions when title/description changes
  useEffect(() => {
    if (showSuggestions && (itemTitle || itemDescription) && categories.length > 0) {
      generateSuggestions();
    }
  }, [itemTitle, itemDescription, categories, showSuggestions]);

  const loadCategories = async () => {
    try {
      // Load all categories for building paths and relationships
      const { data: allCategoriesData, error: allCategoriesError } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name');

      if (allCategoriesError) throw allCategoriesError;
      
      setCategories(allCategoriesData || []);
      
      // Load root categories using optimized function
      const { data: rootData, error: rootError } = await supabase.rpc('get_root_categories');
      
      if (rootError) throw rootError;
      
      const formattedRootData = (rootData || []).map((cat: any) => ({
        ...cat,
        parent_ebay_category_id: null // Root categories have no parent
      }));
      
      setCurrentLevel(formattedRootData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Loading Failed",
        description: "Could not load eBay categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    if (!itemTitle && !itemDescription) return;
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('ebay-category-suggestions', {
        body: {
          title: itemTitle || '',
          description: itemDescription || ''
        }
      });

      if (error) throw error;
      
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const buildSelectedPath = (categoryId: string) => {
    const path: EbayCategory[] = [];
    let currentCat = categories.find(cat => cat.ebay_category_id === categoryId);
    
    while (currentCat) {
      path.unshift(currentCat);
      if (currentCat.parent_ebay_category_id) {
        currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
      } else {
        break;
      }
    }
    
    setSelectedPath(path);
    
    // Set current level for navigation
    if (path.length > 0) {
      const lastSelected = path[path.length - 1];
      if (!lastSelected.leaf_category) {
        const children = categories.filter(cat => cat.parent_ebay_category_id === lastSelected.ebay_category_id);
        setCurrentLevel(children);
      }
    }
  };

  const handleCategorySelect = (category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    setSelectedPath(newPath);

    if (category.leaf_category) {
      // Final selection
      const pathString = newPath.map(cat => cat.category_name).join(' > ');
      onChange(category.ebay_category_id, pathString, category);
      setOpen(false);
    } else {
      // Show children
      const children = categories.filter(cat => cat.parent_ebay_category_id === category.ebay_category_id);
      setCurrentLevel(children);
    }
  };

  const handleSuggestionSelect = (suggestion: CategorySuggestion) => {
    const category = categories.find(cat => cat.ebay_category_id === suggestion.categoryId);
    if (category) {
      buildSelectedPath(suggestion.categoryId);
      onChange(suggestion.categoryId, suggestion.fullPath, category);
      setOpen(false);
    }
  };

  const handleLevelSelect = (levelIndex: number) => {
    const newPath = selectedPath.slice(0, levelIndex + 1);
    setSelectedPath(newPath);
    
    if (levelIndex === -1) {
      const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
      setCurrentLevel(rootCategories);
    } else {
      const selectedCategory = newPath[levelIndex];
      if (!selectedCategory.leaf_category) {
        const children = categories.filter(cat => cat.parent_ebay_category_id === selectedCategory.ebay_category_id);
        setCurrentLevel(children);
      }
    }
  };

  // Filter categories based on search
  const filteredCurrentLevel = useMemo(() => {
    if (!searchQuery.trim()) return currentLevel;
    
    return currentLevel.filter(cat => 
      cat.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentLevel, searchQuery]);

  const getDisplayValue = () => {
    if (categoryPath) return categoryPath;
    if (selectedPath.length === 0) return placeholder;
    return selectedPath.map(cat => cat.category_name).join(' > ');
  };

  const getSelectedCategory = () => {
    if (!value) return null;
    return categories.find(cat => cat.ebay_category_id === value);
  };

  const selectedCategory = getSelectedCategory();

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading categories...
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              compact ? "h-8 text-sm" : "h-10",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="truncate text-left flex-1">
              {getDisplayValue()}
            </span>
            <div className="flex items-center gap-2 ml-2">
              {selectedCategory?.leaf_category && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select eBay Category</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* AI Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">AI Suggestions</span>
                  {loadingSuggestions && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <Button
                      key={suggestion.categoryId}
                      variant="ghost"
                      className="justify-start text-left h-auto p-3 border border-amber-200 bg-amber-50 hover:bg-amber-100"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{suggestion.categoryName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {suggestion.fullPath}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Breadcrumb */}
            {selectedPath.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <button 
                  onClick={() => handleLevelSelect(-1)}
                  className="hover:text-foreground hover:underline"
                >
                  Root
                </button>
                {selectedPath.map((cat, index) => (
                  <React.Fragment key={cat.ebay_category_id}>
                    <span>/</span>
                    <button 
                      onClick={() => handleLevelSelect(index)}
                      className="hover:text-foreground hover:underline"
                    >
                      {cat.category_name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Category List */}
            <div className="flex-1 overflow-hidden">
              <Command className="h-full">
                <CommandList className="max-h-none">
                  {filteredCurrentLevel.length === 0 ? (
                    <CommandEmpty>No categories found</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredCurrentLevel.map((category) => (
                        <CommandItem
                          key={category.ebay_category_id}
                          value={category.category_name}
                          onSelect={() => handleCategorySelect(category)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span>{category.category_name}</span>
                          <div className="flex items-center gap-2">
                            {Array.isArray(category.requires_item_specifics) && category.requires_item_specifics.length > 0 && (
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                            )}
                            {category.leaf_category ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>

            {/* Clear Selection */}
            {selectedPath.length > 0 && (
              <Button 
                variant="ghost"
                onClick={() => {
                  setSelectedPath([]);
                  const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
                  setCurrentLevel(rootCategories);
                  onChange('', '');
                  setOpen(false);
                }}
                className="w-full"
              >
                Clear Selection
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Info */}
      {selectedCategory && (
        <div className="text-xs space-y-1">
          {Array.isArray(selectedCategory.requires_item_specifics) && selectedCategory.requires_item_specifics.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Requires {selectedCategory.requires_item_specifics.length} item specifics</span>
            </div>
          )}
          {selectedCategory.leaf_category && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Valid leaf category</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedCategorySelector;