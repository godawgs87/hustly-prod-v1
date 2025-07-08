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

// CategoryContent Component - extracted to prevent recreation on every render
interface CategoryContentProps {
  searchQuery: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
  selectedPath: EbayCategory[];
  currentLevel: EbayCategory[];
  rootCategories: EbayCategory[];
  resetToRoot: () => void;
  navigateToCategory: (category: EbayCategory, index: number) => void;
  handleGoBack: () => void;
  searchResults: Array<EbayCategory & { score: number; fullPath: string; matchType: string }>;
  debouncedSearchQuery: string;
  handleCategorySelect: (category: EbayCategory, fromSearch?: boolean) => void;
  loadingChildren: Set<string>;
  handleUseThisCategory: (category: EbayCategory) => void;
  categories: EbayCategory[];
  loadCategories: () => void;
  clearSelection: () => void;
  isMobile: boolean;
}

const CategoryContent = React.memo(({
  searchQuery,
  handleSearchChange,
  clearSearch,
  selectedPath,
  currentLevel,
  rootCategories,
  resetToRoot,
  navigateToCategory,
  handleGoBack,
  searchResults,
  debouncedSearchQuery,
  handleCategorySelect,
  loadingChildren,
  handleUseThisCategory,
  categories,
  loadCategories,
  clearSelection,
  isMobile
}: CategoryContentProps) => (
  <div className="flex flex-col h-full max-h-[70vh]">
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
    {(selectedPath.length > 0 || (currentLevel.length > 0 && currentLevel !== rootCategories)) && (
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
      <div className="h-full overflow-y-auto" style={{ maxHeight: isMobile ? '400px' : '500px' }}>
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
));

const EbayCategorySelector = ({ value, onChange, disabled, open: externalOpen, onOpenChange }: EbayCategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [rootCategories, setRootCategories] = useState<EbayCategory[]>([]); // Store root categories separately
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isControlled = externalOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
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

  // Handle dialog opening and initial category setup
  useEffect(() => {
    console.log('🔄 Dialog state changed:', { 
      open, 
      categoriesLength: categories.length, 
      value, 
      currentLevelLength: currentLevel.length,
      isControlled 
    });
    
    if (open && categories.length > 0) {
      if (value) {
        console.log('📍 Building selected path for value:', value);
        buildSelectedPath(value);
      } else {
        console.log('🌳 No value, resetting to root categories');
        resetToRoot();
      }
    }
  }, [open, categories.length, value]);

  // Cache for loaded categories to avoid re-fetching
  const [categoryCache, setCategoryCache] = useState<Map<string, EbayCategory[]>>(new Map());
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());

  const loadCategories = async () => {
    try {
      console.log('🔍 Loading ALL eBay categories...');
      
      // Load ALL categories for complete hierarchy support
      const { data: allData, error: allError } = await supabase
        .from('ebay_categories')
        .select('ebay_category_id, category_name, parent_ebay_category_id, leaf_category')
        .eq('is_active', true)
        .order('category_name');

      console.log('🌳 All categories query result:', { 
        dataCount: allData?.length, 
        error: allError,
        firstFew: allData?.slice(0, 5)?.map(cat => cat.category_name)
      });

      if (allError) {
        console.error('❌ All categories error:', allError);
        throw allError;
      }

      if (!allData || allData.length === 0) {
        console.warn('⚠️ No categories found');
        throw new Error('No categories found in database');
      }

      const validAllCategories = allData.filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      // Debug: Check ALL categories and their parent IDs to understand the data
      console.log('🔍 Sample categories with parent IDs:', validAllCategories.slice(0, 20).map(cat => ({
        name: cat.category_name,
        parentId: cat.parent_ebay_category_id,
        parentType: typeof cat.parent_ebay_category_id,
        isNull: cat.parent_ebay_category_id === null,
        isUndefined: cat.parent_ebay_category_id === undefined,
        isEmpty: cat.parent_ebay_category_id === '',
        isStringNull: cat.parent_ebay_category_id === 'null'
      })));

      // Separate root categories for navigation - simplified null check
      console.log('🔍 First 10 categories with parent IDs:', validAllCategories.slice(0, 10).map(cat => ({
        name: cat.category_name,
        parentId: cat.parent_ebay_category_id,
        isNull: cat.parent_ebay_category_id === null
      })));

      const validRootCategories = validAllCategories.filter(cat => {
        const isRoot = cat.parent_ebay_category_id === null;
        return isRoot;
      });

      console.log('🌳 Root categories found:', validRootCategories.length);

      // Debug: Show what we found as root categories
      console.log('🔍 All root categories found:', validRootCategories.map(cat => ({
        name: cat.category_name,
        id: cat.ebay_category_id,
        parentId: cat.parent_ebay_category_id
      })));

      console.log('🌳 Valid categories:', {
        total: validAllCategories.length,
        roots: validRootCategories.length,
        rootNames: validRootCategories.slice(0, 5).map(cat => cat.category_name)
      });
      
      // Set ALL categories for complete hierarchy support (this fixes search selection!)
      setCategories(validAllCategories);
      setRootCategories(validRootCategories);
      setCurrentLevel(validRootCategories);
      
      console.log('🎯 State updated - categories:', validAllCategories.length, 'currentLevel:', validRootCategories.length);
      
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

  const loadChildCategories = async (parentId: string): Promise<EbayCategory[]> => {
    // Check cache first
    if (categoryCache.has(parentId)) {
      console.log('💾 Using cached children for:', parentId);
      return categoryCache.get(parentId)!;
    }

    try {
      setLoadingChildren(prev => new Set(prev).add(parentId));
      console.log('🔍 Loading children for parent ID:', parentId);
      
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('ebay_category_id, category_name, parent_ebay_category_id, leaf_category')
        .eq('is_active', true)
        .eq('parent_ebay_category_id', parentId)
        .order('category_name');

      if (error) {
        console.error('❌ Error loading children:', error);
        throw error;
      }

      const validChildren = (data || []).filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      console.log('👶 Loaded children for', parentId, ':', {
        count: validChildren.length,
        names: validChildren.map(c => c.category_name)
      });

      // Cache the result
      setCategoryCache(prev => new Map(prev).set(parentId, validChildren));
      
      // Add to main categories array
      setCategories(prev => {
        const existingIds = new Set(prev.map(cat => cat.ebay_category_id));
        const newCategories = validChildren.filter(cat => !existingIds.has(cat.ebay_category_id));
        return [...prev, ...newCategories];
      });

      return validChildren;
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

  const buildSelectedPath = useCallback((categoryId: string) => {
    if (!categoryId || !categories.length) {
      console.log('🚫 BuildSelectedPath early return:', { categoryId, categoriesLength: categories.length });
      return;
    }

    try {
      console.log('🔄 Building path for categoryId:', categoryId);
      const path: EbayCategory[] = [];
      
      // Convert categoryId to string to ensure consistent comparison
      const targetId = String(categoryId).trim();
      let currentCat = categories.find(cat => String(cat.ebay_category_id).trim() === targetId);
      
      if (!currentCat) {
        console.error('❌ Category not found:', targetId, 'Available categories:', categories.slice(0, 5).map(c => ({ id: c.ebay_category_id, name: c.category_name })));
        return;
      }
      
      console.log('✅ Found starting category:', currentCat.category_name);
      
      // Build path from selected category to root
      while (currentCat) {
        path.unshift(currentCat);
        console.log('📝 Added to path:', currentCat.category_name, 'Path length:', path.length);
        
        if (currentCat.parent_ebay_category_id) {
          const parentId = String(currentCat.parent_ebay_category_id).trim();
          currentCat = categories.find(cat => String(cat.ebay_category_id).trim() === parentId);
          if (!currentCat) {
            console.error('❌ Parent category not found:', parentId);
            break;
          }
        } else {
          console.log('🌳 Reached root category');
          break;
        }
      }
      
      console.log('📍 Built category path:', path.map(cat => cat.category_name).join(' > '));
      setSelectedPath(path);
      
      // Set current level based on selected path
      if (path.length > 0) {
        const lastSelected = path[path.length - 1];
        console.log('🎯 Last selected category:', lastSelected.category_name, 'Is leaf:', lastSelected.leaf_category);
        
        if (!lastSelected.leaf_category) {
          const parentId = String(lastSelected.ebay_category_id).trim();
          const children = categories.filter(cat => {
            const childParentId = cat.parent_ebay_category_id ? String(cat.parent_ebay_category_id).trim() : null;
            return childParentId === parentId;
          });
          console.log('👶 Found children for', lastSelected.category_name, ':', children.length, children.map(c => c.category_name));
          setCurrentLevel(children);
        } else {
          console.log('🍃 Leaf category, no children to show');
        }
      }
    } catch (error) {
      console.error('❌ Error building category path:', error);
    }
  }, [categories]);

  // State for search results
  const [searchResults, setSearchResults] = useState<Array<EbayCategory & { score: number; fullPath: string; matchType: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Server-side search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('🔍 Performing server-side search for:', query);
      
      // Search using database query for better performance
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('ebay_category_id, category_name, parent_ebay_category_id, leaf_category')
        .eq('is_active', true)
        .ilike('category_name', `%${query}%`)
        .order('category_name')
        .limit(100);

      if (error) {
        console.error('❌ Search error:', error);
        setSearchResults([]);
        return;
      }

      console.log('📊 Search results from database:', data?.length || 0);

      const validResults = (data || []).filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      // Score and enhance search results
      const scoredResults = validResults.map(category => {
        const categoryName = category.category_name.toLowerCase();
        const queryLower = query.toLowerCase();
        let score = 0;
        let matchType = '';

        // Check for enhanced search patterns first
        const enhancedTerms = SEARCH_ENHANCEMENTS[queryLower] || [];
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
        if (categoryName === queryLower) {
          score = Math.max(score, 100);
          matchType = matchType || 'exact';
        } else if (categoryName.startsWith(queryLower)) {
          score = Math.max(score, 90);
          matchType = matchType || 'starts';
        } else if (categoryName.includes(queryLower)) {
          score = Math.max(score, 70);
          matchType = matchType || 'contains';
        } else if (categoryName.split(/[\s&-]+/).some(word => word.startsWith(queryLower))) {
          score = Math.max(score, 50);
          matchType = matchType || 'word';
        } else {
          score = 30;
          matchType = 'partial';
        }

        // Boost score for root categories and leaf categories
        if (!category.parent_ebay_category_id) score += 15;
        if (category.leaf_category) score += 5;

        return {
          ...category,
          score,
          fullPath: category.category_name, // Will be built properly below
          matchType
        };
      });

      // Build full paths for context (this might need parent loading for complete paths)
      const resultsWithPaths = scoredResults.map(result => ({
        ...result,
        fullPath: result.category_name // For now, just use category name
      }));

      // Sort by score
      const sortedResults = resultsWithPaths
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (!a.parent_ebay_category_id && b.parent_ebay_category_id) return -1;
          if (a.parent_ebay_category_id && !b.parent_ebay_category_id) return 1;
          return a.category_name.localeCompare(b.category_name);
        })
        .slice(0, 50);

      console.log('🎯 Top search results:', sortedResults.slice(0, 3).map(r => ({ name: r.category_name, score: r.score, type: r.matchType })));
      setSearchResults(sortedResults);

    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, performSearch]);

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

  const handleCategorySelect = useCallback(async (category: EbayCategory, fromSearch = false) => {
    console.log('🔄 Category selected:', category.category_name, 'Leaf:', category.leaf_category, 'FromSearch:', fromSearch);
    
    if (category.leaf_category) {
      // This is a final selectable category - handle immediately
      let pathString: string;
      
      if (fromSearch) {
        pathString = getCategoryPath(category);
      } else {
        const newPath = [...selectedPath, category];
        pathString = newPath.map(cat => cat.category_name).join(' > ');
        setSelectedPath(newPath);
      }
      
      console.log('✅ Final category selected:', { categoryId: category.ebay_category_id, pathString });
      onChange(category.ebay_category_id, pathString);
      setOpen(false);
      setSearchQuery(''); // Only clear search on final selection
      return;
    }
    
    // For non-leaf categories, navigate to show children
    let newPath: EbayCategory[];
    
    if (fromSearch) {
      // Build path from search - need to construct the full path
      newPath = [];
      let currentCat: EbayCategory | undefined = category;
      while (currentCat) {
        newPath.unshift(currentCat);
        if (currentCat.parent_ebay_category_id) {
          currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
        } else {
          break;
        }
      }
    } else {
      // Navigation from current level
      newPath = [...selectedPath, category];
    }
    
    console.log('📍 New selected path:', newPath.map(cat => cat.category_name).join(' > '));
    setSelectedPath(newPath);
    
    // Load and show children
    const children = await loadChildCategories(category.ebay_category_id);
    console.log('👶 Loaded children for', category.category_name, ':', children.length);
    setCurrentLevel(children);
    // Don't clear search when navigating - let users keep their search term
  }, [selectedPath, categories, onChange, getCategoryPath, loadChildCategories]);

  const handleUseThisCategory = useCallback((category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    const pathString = newPath.map(cat => cat.category_name).join(' > ');
    console.log('✅ Using non-leaf category:', { categoryId: category.ebay_category_id, pathString });
    
    onChange(category.ebay_category_id, pathString);
    setOpen(false);
    setSearchQuery(''); // Only clear search on final selection
  }, [selectedPath, onChange]);

  const navigateToCategory = useCallback(async (category: EbayCategory, index: number) => {
    const newPath = selectedPath.slice(0, index + 1);
    setSelectedPath(newPath);
    
    // Load children using hierarchical approach
    const children = await loadChildCategories(category.ebay_category_id);
    setCurrentLevel(children);
    // Don't clear search when navigating between levels
  }, [selectedPath, loadChildCategories]);

  const handleGoBack = useCallback(async () => {
    if (selectedPath.length === 0) return;
    
    const newPath = selectedPath.slice(0, -1);
    setSelectedPath(newPath);
    
    if (newPath.length === 0) {
      // Back to root - use stored root categories
      setCurrentLevel(rootCategories);
    } else {
      // Show children of the new last category
      const lastCategory = newPath[newPath.length - 1];
      const children = await loadChildCategories(lastCategory.ebay_category_id);
      setCurrentLevel(children);
    }
  }, [selectedPath, rootCategories, loadChildCategories]);

  const resetToRoot = useCallback(() => {
    console.log('🔄 Resetting to root categories');
    console.log('🌳 Root categories count:', rootCategories.length);
    console.log('🌳 Root categories:', rootCategories.slice(0, 5).map(cat => cat.category_name));
    setSelectedPath([]);
    setCurrentLevel(rootCategories); // Use stored root categories instead of filtering
    // Don't clear search when resetting to root - let users keep searching
  }, [rootCategories]);

  const clearSelection = useCallback(() => {
    resetToRoot();
    onChange('', '');
    setOpen(false);
  }, [resetToRoot, onChange]);

  const getDisplayValue = useCallback(() => {
    // If we have a value prop, try to find the category and build its path
    if (value && categories.length > 0) {
      const category = categories.find(cat => cat.ebay_category_id === value);
      if (category) {
        return getCategoryPath(category);
      }
    }
    
    // Fallback to selectedPath for navigation display
    if (selectedPath.length > 0) {
      return selectedPath.map(cat => cat.category_name).join(' > ');
    }
    
    return "Select eBay Category";
  }, [value, categories, selectedPath, getCategoryPath]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔍 Search input changed from:', searchQuery, 'to:', newValue);
    setSearchQuery(newValue);
  }, []); // Remove searchQuery dependency to prevent input resets

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
            <CategoryContent
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
              clearSearch={clearSearch}
              selectedPath={selectedPath}
              currentLevel={currentLevel}
              rootCategories={rootCategories}
              resetToRoot={resetToRoot}
              navigateToCategory={navigateToCategory}
              handleGoBack={handleGoBack}
              searchResults={searchResults}
              debouncedSearchQuery={debouncedSearchQuery}
              handleCategorySelect={handleCategorySelect}
              loadingChildren={loadingChildren}
              handleUseThisCategory={handleUseThisCategory}
              categories={categories}
              loadCategories={loadCategories}
              clearSelection={clearSelection}
              isMobile={isMobile}
            />
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
      
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Select eBay Category</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <CategoryContent
            searchQuery={searchQuery}
            handleSearchChange={handleSearchChange}
            clearSearch={clearSearch}
            selectedPath={selectedPath}
            currentLevel={currentLevel}
            rootCategories={rootCategories}
            resetToRoot={resetToRoot}
            navigateToCategory={navigateToCategory}
            handleGoBack={handleGoBack}
            searchResults={searchResults}
            debouncedSearchQuery={debouncedSearchQuery}
            handleCategorySelect={handleCategorySelect}
            loadingChildren={loadingChildren}
            handleUseThisCategory={handleUseThisCategory}
            categories={categories}
            loadCategories={loadCategories}
            clearSelection={clearSelection}
            isMobile={isMobile}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EbayCategorySelector;
