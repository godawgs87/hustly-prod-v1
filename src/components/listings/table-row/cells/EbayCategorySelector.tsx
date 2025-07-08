import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Search, ArrowLeft, Check, X, Loader2 } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface EbayCategory {
  ebay_category_id: string;
  category_name: string;
  parent_ebay_category_id: string | null;
  leaf_category: boolean;
}

interface PathItem extends EbayCategory {
  level: number;
  full_path: string;
}

interface SearchResult extends EbayCategory {
  match_score: number;
  full_path: string;
}

interface EbayCategorySelectorProps {
  value?: string | null;
  onChange: (categoryId: string, categoryPath: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const EbayCategorySelector = ({ value, onChange, disabled, open: externalOpen, onOpenChange }: EbayCategorySelectorProps) => {
  const [rootCategories, setRootCategories] = useState<EbayCategory[]>([]);
  const [selectedPath, setSelectedPath] = useState<PathItem[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isControlled = externalOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cache for loaded children to avoid re-fetching
  const [childrenCache, setChildrenCache] = useState<Map<string, EbayCategory[]>>(new Map());

  // Load root categories using server-side function
  const loadRootCategories = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading root categories using server function...');
      
      const { data, error } = await supabase.rpc('get_root_categories');

      if (error) {
        console.error('❌ Error loading root categories:', error);
        throw error;
      }

      console.log('🌳 Loaded root categories:', data?.length || 0);
      // Add parent_ebay_category_id field for root categories
      const rootCategoriesWithParent = (data || []).map(cat => ({
        ...cat,
        parent_ebay_category_id: null as string | null
      }));
      setRootCategories(rootCategoriesWithParent);
      setCurrentLevel(rootCategoriesWithParent);
      
    } catch (error) {
      console.error('❌ Error loading root categories:', error);
      toast({
        title: "Loading Failed", 
        description: "Could not load eBay categories. Please try again.",
        variant: "destructive"
      });
      setRootCategories([]);
      setCurrentLevel([]);
    } finally {
      setLoading(false);
    }
  };

  // Load child categories using server-side function with caching
  const loadChildCategories = async (parentId: string): Promise<EbayCategory[]> => {
    // Check cache first
    if (childrenCache.has(parentId)) {
      console.log('💾 Using cached children for:', parentId);
      return childrenCache.get(parentId)!;
    }

    try {
      setLoadingChildren(prev => new Set(prev).add(parentId));
      console.log('🔍 Loading children for parent ID:', parentId);
      
      const { data, error } = await supabase.rpc('get_child_categories', { parent_id: parentId });

      if (error) {
        console.error('❌ Error loading children:', error);
        throw error;
      }

      const children = data || [];
      console.log('👶 Loaded children for', parentId, ':', children.length);

      // Cache the result
      setChildrenCache(prev => new Map(prev).set(parentId, children));
      
      return children;
    } catch (error) {
      console.error('❌ Error loading child categories:', error);
      return [];
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  // Build category path using server-side function
  const buildCategoryPath = async (categoryId: string) => {
    try {
      console.log('🔄 Building path for categoryId:', categoryId);
      
      const { data, error } = await supabase.rpc('get_category_path', { category_id: categoryId });

      if (error) {
        console.error('❌ Error building category path:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No path data returned for category:', categoryId);
        return;
      }

      console.log('📍 Built category path:', data.map(item => item.category_name).join(' > '));
      setSelectedPath(data);
      
      // Set current level to children of the deepest category if it's not a leaf
      const deepestCategory = data[0]; // Data is ordered by level DESC, so first item is deepest
      if (deepestCategory && !deepestCategory.leaf_category) {
        const children = await loadChildCategories(deepestCategory.ebay_category_id);
        setCurrentLevel(children);
      }
      
    } catch (error) {
      console.error('❌ Error building category path:', error);
    }
  };

  // Search categories using server-side function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('🔍 Performing server-side search for:', query);
      
      const { data, error } = await supabase.rpc('search_categories', { 
        search_term: query,
        limit_count: 50 
      });

      if (error) {
        console.error('❌ Search error:', error);
        setSearchResults([]);
        return;
      }

      console.log('🎯 Search results:', data?.length || 0);
      setSearchResults(data || []);

    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Initialize component
  useEffect(() => {
    loadRootCategories();
  }, []);

  // Handle value changes
  useEffect(() => {
    if (value && !loading) {
      buildCategoryPath(value);
    } else if (!value && !loading) {
      resetToRoot();
    }
  }, [value, loading]);

  // Handle search
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, performSearch]);

  // Handle category selection
  const handleCategorySelect = useCallback(async (category: EbayCategory, fromSearch = false) => {
    console.log('🔄 Category selected:', category.category_name, 'Leaf:', category.leaf_category, 'FromSearch:', fromSearch);
    
    if (category.leaf_category) {
      // This is a final selectable category
      let pathString: string;
      
      if (fromSearch) {
        // Use server-side function to get complete path
        const { data } = await supabase.rpc('get_category_path', { category_id: category.ebay_category_id });
        pathString = data?.[data.length - 1]?.full_path || category.category_name;
      } else {
        // Build path from current navigation
        const newPath = [...selectedPath, { 
          ...category, 
          level: selectedPath.length,
          full_path: [...selectedPath.map(p => p.category_name), category.category_name].join(' > ')
        }];
        pathString = newPath.map(cat => cat.category_name).join(' > ');
      }
      
      console.log('✅ Final category selected:', { categoryId: category.ebay_category_id, pathString });
      onChange(category.ebay_category_id, pathString);
      setOpen(false);
      setSearchQuery('');
      return;
    }
    
    // For non-leaf categories, navigate to show children
    if (fromSearch) {
      // Build complete path using server-side function
      await buildCategoryPath(category.ebay_category_id);
    } else {
      // Navigation from current level
      const newPath = [...selectedPath, { 
        ...category, 
        level: selectedPath.length,
        full_path: [...selectedPath.map(p => p.category_name), category.category_name].join(' > ')
      }];
      setSelectedPath(newPath);
      
      // Load and show children
      const children = await loadChildCategories(category.ebay_category_id);
      setCurrentLevel(children);
    }
  }, [selectedPath, onChange]);

  // Handle using non-leaf category as final selection
  const handleUseThisCategory = useCallback((category: EbayCategory) => {
    const newPath = [...selectedPath, { 
      ...category, 
      level: selectedPath.length,
      full_path: [...selectedPath.map(p => p.category_name), category.category_name].join(' > ')
    }];
    const pathString = newPath.map(cat => cat.category_name).join(' > ');
    console.log('✅ Using non-leaf category:', { categoryId: category.ebay_category_id, pathString });
    
    onChange(category.ebay_category_id, pathString);
    setOpen(false);
    setSearchQuery('');
  }, [selectedPath, onChange]);

  // Navigate to specific category in breadcrumb
  const navigateToCategory = useCallback(async (category: PathItem, index: number) => {
    const newPath = selectedPath.slice(0, index + 1);
    setSelectedPath(newPath);
    
    // Load children of the selected category
    const children = await loadChildCategories(category.ebay_category_id);
    setCurrentLevel(children);
  }, [selectedPath]);

  // Go back one level
  const handleGoBack = useCallback(async () => {
    if (selectedPath.length === 0) return;
    
    const newPath = selectedPath.slice(0, -1);
    setSelectedPath(newPath);
    
    if (newPath.length === 0) {
      // Back to root
      setCurrentLevel(rootCategories);
    } else {
      // Show children of the new last category
      const lastCategory = newPath[newPath.length - 1];
      const children = await loadChildCategories(lastCategory.ebay_category_id);
      setCurrentLevel(children);
    }
  }, [selectedPath, rootCategories]);

  // Reset to root categories
  const resetToRoot = useCallback(() => {
    console.log('🔄 Resetting to root categories');
    setSelectedPath([]);
    setCurrentLevel(rootCategories);
  }, [rootCategories]);

  // Clear selection
  const clearSelection = useCallback(() => {
    resetToRoot();
    onChange('', '');
    setOpen(false);
  }, [resetToRoot, onChange]);

  // Get display value for button
  const getDisplayValue = useCallback(() => {
    if (selectedPath.length > 0) {
      return selectedPath.map(cat => cat.category_name).join(' > ');
    }
    return "Select eBay Category";
  }, [selectedPath]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading categories...
      </Button>
    );
  }

  const CategoryContent = (
    <div className="flex flex-col h-full">
      {/* Search Box */}
      <div className="p-4 border-b bg-background flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
            autoComplete="off"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb and Back Button */}
      {selectedPath.length > 0 && (
        <div className="p-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button onClick={resetToRoot} className="hover:text-foreground hover:underline">
              Root
            </button>
            {selectedPath.map((cat, index) => (
              <React.Fragment key={cat.ebay_category_id}>
                <span>/</span>
                <button 
                  onClick={() => navigateToCategory(cat, index)}
                  className="hover:text-foreground hover:underline"
                >
                  {cat.category_name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="h-8 px-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      )}

      {/* Category List */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto" style={{ maxHeight: isMobile ? '300px' : '400px' }}>
          {searchQuery ? (
            // Search Results
            <div className="p-2">
              {searchLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No categories found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={result.ebay_category_id}
                      onClick={() => handleCategorySelect(result, true)}
                      className="p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.category_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.match_score)}%
                          </Badge>
                          {result.leaf_category && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Final
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.full_path}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Current Level Categories
            <div className="p-2">
              {currentLevel.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div>No categories available</div>
                  <Button 
                    variant="outline" 
                    onClick={loadRootCategories} 
                    className="mt-4"
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Retry Loading
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                    {selectedPath.length === 0 ? `Categories (${currentLevel.length})` : `Subcategories (${currentLevel.length})`}
                  </div>
                  {currentLevel.map((category) => (
                    <div key={category.ebay_category_id}>
                      <div
                        onClick={() => handleCategorySelect(category)}
                        className="p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border transition-colors mx-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{category.category_name}</span>
                          <div className="flex items-center gap-2">
                            {loadingChildren.has(category.ebay_category_id) ? (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : category.leaf_category ? (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Final
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Has subcategories</span>
                                <ChevronDown className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Use This Category option for non-leaf categories */}
                      {!category.leaf_category && (
                        <div className="px-5 pb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseThisCategory(category);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Use "{category.category_name}" as final category
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Selection */}
      {selectedPath.length > 0 && (
        <div className="p-4 border-t bg-background flex-shrink-0">
          <Button 
            variant="ghost" 
            onClick={clearSelection}
            className="w-full"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">{getDisplayValue()}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="max-h-[70vh] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b flex-shrink-0">
            <SheetTitle>Select eBay Category</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {CategoryContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">{getDisplayValue()}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[60vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Select eBay Category</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          {CategoryContent}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EbayCategorySelector;