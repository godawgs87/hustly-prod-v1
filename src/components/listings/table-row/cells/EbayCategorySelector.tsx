import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EbayCategory {
  ebay_category_id: string;
  category_name: string;
  parent_ebay_category_id: string | null;
  leaf_category: boolean;
  fullPath?: string; // Add optional fullPath for enhanced search results
}

interface EbayCategorySelectorProps {
  value?: string | null;
  onChange: (categoryId: string, categoryPath: string) => void;
  disabled?: boolean;
}

const EbayCategorySelector = ({ value, onChange, disabled }: EbayCategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EbayCategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (value && !loading) {
      buildSelectedPath(value);
    }
  }, [value, loading]);

  const loadCategories = async () => {
    try {
      console.log('🔍 Loading eBay root categories...');
      
      // Only load root categories initially for better performance
      const { data: rootData, error: rootError } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('is_active', true)
        .is('parent_ebay_category_id', null) // Only root categories
        .not('ebay_category_id', 'is', null)
        .not('category_name', 'is', null)
        .order('category_name');

      if (rootError) {
        console.error('❌ Error loading root categories:', rootError);
        throw rootError;
      }

      // Defensive filter to ensure data integrity
      const validRootCategories = (rootData || []).filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      console.log('✅ Loaded root categories:', validRootCategories.length);
      
      // Set root categories as both the full category list (for now) and current level
      setCategories(validRootCategories);
      setCurrentLevel(validRootCategories);
      
      // Check if we need to trigger a category sync (if very few root categories)
      if (validRootCategories.length < 10) {
        console.log('⚠️ Very few root categories, checking sync status...');
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('ebay-category-sync', {
            body: { fullSync: true }
          });
          if (syncError) {
            console.error('❌ Sync failed:', syncError);
          } else {
            console.log('✅ Categories sync triggered:', syncData);
          }
        } catch (syncErr) {
          console.error('❌ Sync error:', syncErr);
        }
      }
    } catch (error) {
      console.error('❌ Error loading eBay categories:', error);
      toast({
        title: "Loading Failed",
        description: "Could not load eBay categories. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // New function to load child categories lazily
  const loadChildCategories = async (parentCategoryId: string): Promise<EbayCategory[]> => {
    try {
      console.log('🔍 Loading child categories for:', parentCategoryId);
      
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('is_active', true)
        .eq('parent_ebay_category_id', parentCategoryId)
        .not('ebay_category_id', 'is', null)
        .not('category_name', 'is', null)
        .order('category_name');

      if (error) {
        console.error('❌ Error loading child categories:', error);
        return [];
      }

      const validChildren = (data || []).filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      console.log('✅ Loaded child categories:', validChildren.length);
      return validChildren;
    } catch (error) {
      console.error('❌ Error loading child categories:', error);
      return [];
    }
  };

  const buildSelectedPath = async (categoryId: string) => {
    // Add guard clause for empty categoryId
    if (!categoryId) {
      console.log('⚠️ Cannot build path: no categoryId provided');
      return;
    }

    try {
      console.log('📍 Building category path for:', categoryId);
      
      // Fetch the full path from root to the selected category
      const { data: selectedCategory, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('ebay_category_id', categoryId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !selectedCategory) {
        console.log('⚠️ Category not found:', categoryId);
        return;
      }

      // Build path by walking up the parent chain
      const path: EbayCategory[] = [];
      let currentCat = selectedCategory;
      
      while (currentCat) {
        path.unshift(currentCat);
        
        if (currentCat.parent_ebay_category_id) {
          const { data: parentCat } = await supabase
            .from('ebay_categories')
            .select('*')
            .eq('ebay_category_id', currentCat.parent_ebay_category_id)
            .eq('is_active', true)
            .maybeSingle();
          
          currentCat = parentCat || null;
        } else {
          break;
        }
      }
      
      console.log('📍 Built category path:', path.map(cat => cat.category_name).join(' > '));
      setSelectedPath(path);
      
      // Update categories state with the path categories and load current level
      setCategories(prev => {
        const existingIds = new Set(prev.map(cat => cat.ebay_category_id));
        const newCategories = path.filter(cat => !existingIds.has(cat.ebay_category_id));
        return [...prev, ...newCategories];
      });
      
      // Load and set current level (children of the last selected category)
      if (path.length > 0) {
        const lastSelected = path[path.length - 1];
        if (!lastSelected.leaf_category) {
          const children = await loadChildCategories(lastSelected.ebay_category_id);
          setCategories(prev => {
            const existing = prev.filter(cat => cat.parent_ebay_category_id !== lastSelected.ebay_category_id);
            return [...existing, ...children];
          });
          setCurrentLevel(children);
        }
      }
    } catch (error) {
      console.error('❌ Error building category path:', error);
    }
  };

  const handleCategorySelect = async (category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    setSelectedPath(newPath);

    if (category.leaf_category) {
      // Final selection - leaf category
      const pathString = newPath.map(cat => cat.category_name).join(' > ');
      console.log('🔄 EbayCategorySelector: Calling onChange with leaf category', { 
        categoryId: category.ebay_category_id, 
        pathString 
      });
      onChange(category.ebay_category_id, pathString);
    } else {
      // Load children lazily for next level
      const children = await loadChildCategories(category.ebay_category_id);
      
      // Update the categories state with the newly loaded children
      setCategories(prev => {
        const existing = prev.filter(cat => cat.parent_ebay_category_id !== category.ebay_category_id);
        return [...existing, ...children];
      });
      
      setCurrentLevel(children);
    }
  };

  const handleLevelSelect = async (levelIndex: number) => {
    const newPath = selectedPath.slice(0, levelIndex + 1);
    setSelectedPath(newPath);
    
    if (levelIndex === -1) {
      // Back to root - use root categories from current state
      const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
      setCurrentLevel(rootCategories);
    } else {
      const selectedCategory = newPath[levelIndex];
      if (!selectedCategory.leaf_category) {
        // Load children lazily when navigating back to a level
        const children = await loadChildCategories(selectedCategory.ebay_category_id);
        
        // Update categories state with the loaded children
        setCategories(prev => {
          const existing = prev.filter(cat => cat.parent_ebay_category_id !== selectedCategory.ebay_category_id);
          return [...existing, ...children];
        });
        
        setCurrentLevel(children);
      }
    }
  };

  // Handle search functionality with full path context
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // Search across all categories in database with proper encoding
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('is_active', true)
        .ilike('category_name', `%${query.replace(/[%_]/g, '\\$&')}%`)
        .order('category_name')
        .limit(100); // Increase limit for better search results

      if (error) throw error;
      
      // Enhance search results with full paths
      const enhancedResults = await Promise.all((data || []).map(async (category) => {
        const fullPath = await getCategoryPath(category.ebay_category_id);
        return {
          ...category,
          fullPath
        };
      }));

      // Sort by relevance - prefer leaf categories and shorter paths
      const sortedResults = enhancedResults.sort((a, b) => {
        // Prioritize leaf categories
        if (a.leaf_category && !b.leaf_category) return -1;
        if (!a.leaf_category && b.leaf_category) return 1;
        
        // Then by path length (shorter = more specific)
        const aDepth = a.fullPath.split(' > ').length;
        const bDepth = b.fullPath.split(' > ').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        
        // Finally alphabetical
        return a.category_name.localeCompare(b.category_name);
      });
      
      setSearchResults(sortedResults.slice(0, 50)); // Show more results
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = async (category: EbayCategory) => {
    if (category.leaf_category) {
      // Build path for selected category
      await buildSelectedPath(category.ebay_category_id);
      const pathString = await getCategoryPath(category.ebay_category_id);
      console.log('🔄 EbayCategorySelector: Calling onChange from search result', { 
        categoryId: category.ebay_category_id, 
        pathString 
      });
      onChange(category.ebay_category_id, pathString);
    } else {
      // Navigate to this category level
      await buildSelectedPath(category.ebay_category_id);
      const children = await loadChildCategories(category.ebay_category_id);
      setCurrentLevel(children);
    }
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  const getCategoryPath = async (categoryId: string): Promise<string> => {
    try {
      const { data: category } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('ebay_category_id', categoryId)
        .single();

      if (!category) return '';

      const path: string[] = [];
      let currentCat = category;
      
      while (currentCat) {
        path.unshift(currentCat.category_name);
        
        if (currentCat.parent_ebay_category_id) {
          const { data: parentCat } = await supabase
            .from('ebay_categories')
            .select('*')
            .eq('ebay_category_id', currentCat.parent_ebay_category_id)
            .maybeSingle();
          
          currentCat = parentCat;
        } else {
          break;
        }
      }
      
      return path.join(' > ');
    } catch {
      return '';
    }
  };

  const getDisplayValue = () => {
    if (selectedPath.length === 0) return "Select eBay Category";
    return selectedPath.map(cat => cat.category_name).join(' > ');
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        Loading categories...
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-background border shadow-lg z-[100] p-0"
        align="start"
        sideOffset={5}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        style={{ 
          backgroundColor: 'hsl(var(--background))',
          zIndex: 1000
        }}
      >
        {/* Search Box */}
        <div className="p-2 border-b bg-background sticky top-0 z-20">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 bg-background"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="max-h-[50vh] overflow-y-auto">
            <DropdownMenuLabel className="flex items-center gap-2 bg-background sticky top-0 z-10">
              Search Results ({searchResults.length})
              {isSearching && <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
            </DropdownMenuLabel>
            {searchResults.length === 0 && !isSearching ? (
              <DropdownMenuItem disabled className="p-4 text-center">
                No results found for "{searchQuery}"
              </DropdownMenuItem>
            ) : (
              <div className="space-y-1 p-1">
                {searchResults.map((category) => (
                  <DropdownMenuItem
                    key={`search-${category.ebay_category_id}`}
                    onClick={() => handleSearchResultSelect(category)}
                    className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{category.category_name}</span>
                      {category.leaf_category ? (
                        <span className="text-xs text-green-600 ml-2 font-semibold">✓ Final</span>
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-2 text-muted-foreground" />
                      )}
                    </div>
                    {category.fullPath && (
                      <div className="text-xs text-gray-500 mt-1 w-full truncate">
                        {category.fullPath}
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            <DropdownMenuSeparator />
          </div>
        )}

        {/* Breadcrumb navigation - Enhanced */}
        {selectedPath.length > 0 && !searchQuery && (
          <>
            <div className="p-2 bg-muted/50 border-b">
              <div className="flex items-center gap-1 text-xs">
                <button 
                  onClick={() => handleLevelSelect(-1)}
                  className="hover:underline text-primary hover:text-primary/80 font-medium"
                >
                  Root
                </button>
                {selectedPath.map((cat, index) => (
                  <React.Fragment key={cat.ebay_category_id}>
                    <ChevronDown className="h-3 w-3 rotate-[-90deg] text-muted-foreground" />
                    <button 
                      onClick={() => handleLevelSelect(index)}
                      className="hover:underline text-primary hover:text-primary/80 truncate max-w-24"
                      title={cat.category_name}
                    >
                      {cat.category_name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              {selectedPath.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLevelSelect(selectedPath.length - 2)}
                  className="mt-1 h-6 px-2 text-xs"
                >
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Go Up
                </Button>
              )}
            </div>
          </>
        )}

        {/* Current level options */}
        {!searchQuery && (
          <>
            <DropdownMenuLabel>
              {selectedPath.length === 0 ? 'Categories' : 'Subcategories'}
            </DropdownMenuLabel>
            
            {currentLevel.length === 0 ? (
              <DropdownMenuItem disabled>
                No subcategories available
              </DropdownMenuItem>
            ) : (
              currentLevel.map((category) => (
                <DropdownMenuItem
                  key={category.ebay_category_id}
                  onClick={() => handleCategorySelect(category)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{category.category_name}</span>
                  {category.leaf_category ? (
                    <span className="text-xs text-muted-foreground ml-2">✓</span>
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-2" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </>
        )}

        {/* Clear selection */}
        {selectedPath.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                setSelectedPath([]);
                const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
                setCurrentLevel(rootCategories);
                // Reset all search state
                setSearchQuery('');
                setSearchResults([]);
                setIsSearching(false);
                onChange('', '');
              }}
              className="text-muted-foreground"
            >
              Clear Selection
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EbayCategorySelector;