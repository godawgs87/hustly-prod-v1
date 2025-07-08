import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { cn } from '@/lib/utils';

interface EbayCategory {
  ebay_category_id: string;
  category_name: string;
  parent_ebay_category_id: string | null;
  leaf_category: boolean;
}

interface EbayCategorySelectorProps {
  value?: string | null;
  onChange: (categoryId: string, categoryPath: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Enhanced search with special patterns for common terms
const SEARCH_ENHANCEMENTS: Record<string, string[]> = {
  'toy': ['Toys & Hobbies', 'toy', 'game'],
  'toys': ['Toys & Hobbies', 'toy', 'game'],
  'game': ['Toys & Hobbies', 'Games', 'Video Games', 'game'],
  'games': ['Toys & Hobbies', 'Games', 'Video Games', 'game'],
  'clothing': ['Clothing, Shoes & Accessories', 'Women', 'Men', 'Kids', 'cloth'],
  'clothes': ['Clothing, Shoes & Accessories', 'Women', 'Men', 'Kids', 'cloth'],
  'shoe': ['Clothing, Shoes & Accessories', 'Athletic Shoes', 'Casual Shoes', 'shoe'],
  'shoes': ['Clothing, Shoes & Accessories', 'Athletic Shoes', 'Casual Shoes', 'shoe'],
  'car': ['eBay Motors', 'Automotive', 'Parts & Accessories', 'motor'],
  'cars': ['eBay Motors', 'Automotive', 'Parts & Accessories', 'motor'],
  'book': ['Books', 'Textbooks', 'Fiction & Literature', 'book'],
  'books': ['Books', 'Textbooks', 'Fiction & Literature', 'book'],
  'electronic': ['Electronics', 'Cell Phones', 'Computers', 'electronic'],
  'electronics': ['Electronics', 'Cell Phones', 'Computers', 'electronic'],
  'jewelry': ['Jewelry & Watches', 'Fine Jewelry', 'Fashion Jewelry', 'jewelry'],
  'art': ['Art', 'Paintings', 'Antiques', 'art'],
  'music': ['Music', 'CDs', 'Vinyl Records', 'Musical Instruments', 'music'],
  'sport': ['Sporting Goods', 'Exercise & Fitness', 'Outdoor Sports', 'sport'],
  'sports': ['Sporting Goods', 'Exercise & Fitness', 'Outdoor Sports', 'sport']
};

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
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (value && categories.length > 0) {
      buildSelectedPath(value);
    } else if (!value && categories.length > 0) {
      resetToRoot();
    }
  }, [value, categories]);

  const loadCategories = async () => {
    try {
      console.log('🔍 Loading eBay categories...');
      
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('ebay_category_id, category_name, parent_ebay_category_id, leaf_category')
        .eq('is_active', true)
        .order('category_name');

      console.log('📊 Raw database response:', { dataCount: data?.length, error });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No categories returned from database');
        throw new Error('No categories found in database');
      }

      const validCategories = data.filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      const rootCategories = validCategories.filter(cat => !cat.parent_ebay_category_id);
      
      console.log('✅ Categories processed:', {
        total: validCategories.length,
        roots: rootCategories.length,
        leaves: validCategories.filter(cat => cat.leaf_category).length
      });
      
      console.log('🌳 Root categories found:', rootCategories.map(cat => ({ 
        id: cat.ebay_category_id, 
        name: cat.category_name 
      })));
      
      setCategories(validCategories);
      setCurrentLevel(rootCategories);
      
      console.log('🎯 State updated - currentLevel should now have:', rootCategories.length, 'categories');
      
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      toast({
        title: "Loading Failed", 
        description: "Could not load eBay categories. Please try again.",
        variant: "destructive"
      });
      
      setCategories([]);
      setCurrentLevel([]);
    } finally {
      setLoading(false);
    }
  };

  const buildSelectedPath = useCallback((categoryId: string) => {
    if (!categoryId || !categories.length) return;

    try {
      const path: EbayCategory[] = [];
      let currentCat = categories.find(cat => cat.ebay_category_id === categoryId);
      
      // Build path from selected category to root
      while (currentCat) {
        path.unshift(currentCat);
        if (currentCat.parent_ebay_category_id) {
          currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
        } else {
          break;
        }
      }
      
      console.log('📍 Built category path:', path.map(cat => cat.category_name).join(' > '));
      setSelectedPath(path);
      
      // Set current level based on selected path
      if (path.length > 0) {
        const lastSelected = path[path.length - 1];
        if (!lastSelected.leaf_category) {
          const children = categories.filter(cat => cat.parent_ebay_category_id === lastSelected.ebay_category_id);
          setCurrentLevel(children);
        }
      }
    } catch (error) {
      console.error('❌ Error building category path:', error);
    }
  }, [categories]);

  // Enhanced search with intelligent matching and hierarchical awareness
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    console.log('🔍 Search query:', query, 'Categories count:', categories.length);
    const results: Array<EbayCategory & { score: number; fullPath: string; matchType: string }> = [];
    
    // Check for enhanced search patterns first
    const enhancedTerms = SEARCH_ENHANCEMENTS[query] || [];
    console.log('🎯 Enhanced terms for query:', enhancedTerms);
    
    categories.forEach(category => {
      const categoryName = category.category_name.toLowerCase();
      let score = 0;
      let matchType = '';
      
      // Enhanced pattern matching for common search terms - more aggressive matching
      if (enhancedTerms.length > 0) {
        const isEnhancedMatch = enhancedTerms.some(term => {
          const termLower = term.toLowerCase();
          return categoryName.includes(termLower) || 
                 categoryName.split(/[\s&-]+/).some(word => word.includes(termLower)) ||
                 termLower.includes(categoryName);
        });
        if (isEnhancedMatch) {
          score = 95;
          matchType = 'enhanced';
        }
      }
      
      // Direct matching patterns
      // Exact match gets highest score
      if (categoryName === query) {
        score = Math.max(score, 100);
        matchType = matchType || 'exact';
      }
      // Starts with query gets high score
      else if (categoryName.startsWith(query)) {
        score = Math.max(score, 90);
        matchType = matchType || 'starts';
      }
      // Contains query gets medium score
      else if (categoryName.includes(query)) {
        score = Math.max(score, 70);
        matchType = matchType || 'contains';
      }
      // Word boundary match gets lower score
      else if (categoryName.split(/[\s&-]+/).some(word => word.startsWith(query))) {
        score = Math.max(score, 50);
        matchType = matchType || 'word';
      }
      // Partial word match for longer queries
      else if (query.length >= 2 && categoryName.split(/[\s&-]+/).some(word => word.includes(query))) {
        score = Math.max(score, 30);
        matchType = matchType || 'partial';
      }
      
      // Boost score for root categories
      if (!category.parent_ebay_category_id && score > 0) {
        score += 15;
      }
      
      // Boost score for leaf categories (final selectable)
      if (category.leaf_category && score > 0) {
        score += 5;
      }
      
      if (score > 0) {
        // Build full path for context
        const path: string[] = [];
        let currentCat: EbayCategory | undefined = category;
        
        while (currentCat) {
          path.unshift(currentCat.category_name);
          if (currentCat.parent_ebay_category_id) {
            currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
          } else {
            break;
          }
        }
        
        results.push({
          ...category,
          score,
          fullPath: path.join(' > '),
          matchType
        });
      }
    });
    
    console.log('🔍 Search results count:', results.length, 'for query:', query);
    if (results.length > 0) {
      console.log('🎯 Top 3 results:', results.slice(0, 3).map(r => ({ name: r.category_name, score: r.score, type: r.matchType })));
    }
    
    // Sort by score (descending), then by category level (root first), then by name
    return results
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (!a.parent_ebay_category_id && b.parent_ebay_category_id) return -1;
        if (a.parent_ebay_category_id && !b.parent_ebay_category_id) return 1;
        return a.category_name.localeCompare(b.category_name);
      })
      .slice(0, 50);
  }, [debouncedSearchQuery, categories]);

  const handleCategorySelect = useCallback((category: EbayCategory, fromSearch = false) => {
    console.log('🔄 Category selected:', category.category_name, 'Leaf:', category.leaf_category);
    
    if (fromSearch) {
      // For search results, build the full path first
      buildSelectedPath(category.ebay_category_id);
      
      if (category.leaf_category) {
        // For leaf categories, select immediately
        const path = getCategoryPath(category);
        onChange(category.ebay_category_id, path);
        setOpen(false);
        setSearchQuery('');
        return;
      }
    } else {
      // For navigation, add to current path
      const newPath = [...selectedPath, category];
      setSelectedPath(newPath);

      if (category.leaf_category) {
        // This is a final selectable category
        const pathString = newPath.map(cat => cat.category_name).join(' > ');
        console.log('✅ Final category selected:', { categoryId: category.ebay_category_id, pathString });
        
        onChange(category.ebay_category_id, pathString);
        setOpen(false);
        setSearchQuery('');
        return;
      }
    }
    
    // Show children of selected category
    const children = categories.filter(cat => cat.parent_ebay_category_id === category.ebay_category_id);
    setCurrentLevel(children);
    setSearchQuery('');
  }, [selectedPath, categories, onChange, buildSelectedPath]);

  const handleUseThisCategory = useCallback((category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    const pathString = newPath.map(cat => cat.category_name).join(' > ');
    console.log('✅ Using non-leaf category:', { categoryId: category.ebay_category_id, pathString });
    
    onChange(category.ebay_category_id, pathString);
    setOpen(false);
    setSearchQuery('');
  }, [selectedPath, onChange]);

  const handleGoBack = useCallback(() => {
    if (selectedPath.length === 0) return;
    
    const newPath = selectedPath.slice(0, -1);
    setSelectedPath(newPath);
    
    if (newPath.length === 0) {
      // Back to root
      const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
      setCurrentLevel(rootCategories);
    } else {
      // Show children of the new last category
      const lastCategory = newPath[newPath.length - 1];
      const children = categories.filter(cat => cat.parent_ebay_category_id === lastCategory.ebay_category_id);
      setCurrentLevel(children);
    }
  }, [selectedPath, categories]);

  const navigateToCategory = useCallback((category: EbayCategory, index: number) => {
    const newPath = selectedPath.slice(0, index + 1);
    setSelectedPath(newPath);
    const children = categories.filter(c => c.parent_ebay_category_id === category.ebay_category_id);
    setCurrentLevel(children);
    setSearchQuery('');
  }, [selectedPath, categories]);

  const resetToRoot = useCallback(() => {
    console.log('🔄 Resetting to root categories');
    const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
    console.log('🌳 Root categories count:', rootCategories.length);
    setSelectedPath([]);
    setCurrentLevel(rootCategories);
    setSearchQuery('');
  }, [categories]);

  const clearSelection = useCallback(() => {
    resetToRoot();
    onChange('', '');
    setOpen(false);
  }, [resetToRoot, onChange]);

  const getCategoryPath = useCallback((category: EbayCategory): string => {
    const path: string[] = [];
    let currentCat: EbayCategory | undefined = category;
    
    while (currentCat) {
      path.unshift(currentCat.category_name);
      if (currentCat.parent_ebay_category_id) {
        currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
      } else {
        break;
      }
    }
    
    return path.join(' > ');
  }, [categories]);

  const getDisplayValue = useCallback(() => {
    if (selectedPath.length === 0) return "Select eBay Category";
    return selectedPath.map(cat => cat.category_name).join(' > ');
  }, [selectedPath]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔍 Search input changed from:', searchQuery, 'to:', newValue);
    setSearchQuery(newValue);
  }, [searchQuery]);

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

  const CategoryContent = () => (
    <div className="flex flex-col h-full">
      {/* Search Box */}
      <div className="p-4 border-b bg-background">
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

      {/* Breadcrumb */}
      {!searchQuery && selectedPath.length > 0 && (
        <div className="p-4 border-b bg-muted/30">
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
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          // Search Results
          <div className="p-2">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {debouncedSearchQuery !== searchQuery ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : (
                  `No categories found for "${searchQuery}"`
                )}
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
                           {Math.round(result.score)}% • {result.matchType}
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
                      {result.fullPath}
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
                  <div>
                    {categories.length === 0 ? 'No categories available' : `No categories found at this level (categories: ${categories.length}, currentLevel: ${currentLevel.length})`}
                  </div>
                  <div className="text-xs mt-2">
                    Debug: Categories total: {categories.length}, CurrentLevel: {currentLevel.length}
                  </div>
                  {categories.length === 0 && (
                    <Button 
                      variant="outline" 
                      onClick={loadCategories} 
                      className="mt-4"
                    >
                      <Loader2 className="h-4 w-4 mr-2" />
                      Retry Loading
                    </Button>
                  )}
                </div>
             ) : (
               <div className="space-y-1">
                 <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                   {selectedPath.length === 0 ? `Categories (${currentLevel.length})` : `Subcategories (${currentLevel.length})`}
                   <div className="text-xs opacity-70">Debug: Rendering {currentLevel.length} items</div>
                 </div>
                 {currentLevel.map((category) => (
                  <div key={category.ebay_category_id} className="space-y-1">
                    <div
                      onClick={() => handleCategorySelect(category)}
                      className="p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.category_name}</span>
                        <div className="flex items-center gap-2">
                          {category.leaf_category ? (
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
                      <div className="px-3">
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

      {/* Clear Selection */}
      {selectedPath.length > 0 && (
        <div className="p-4 border-t bg-background">
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
        
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b flex-shrink-0">
            <SheetTitle>Select eBay Category</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CategoryContent />
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
      
      <DialogContent className="max-w-2xl h-[600px] p-0 fixed top-[10%] left-[50%] translate-x-[-50%]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Select eBay Category</DialogTitle>
        </DialogHeader>
        <div className="h-full">
          <CategoryContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EbayCategorySelector;