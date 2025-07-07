import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
}

const EbayCategorySelector = ({ value, onChange, disabled }: EbayCategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EbayCategory[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Load all categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Build selected path when value changes
  useEffect(() => {
    if (value && categories.length > 0) {
      buildSelectedPath(value);
    }
  }, [value, categories]);

  const loadCategories = async () => {
    try {
      console.log('🔍 Loading eBay categories...');
      
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name');

      if (error) throw error;

      const validCategories = (data || []).filter(cat => 
        cat.ebay_category_id && 
        cat.category_name && 
        cat.ebay_category_id.trim() !== '' &&
        cat.category_name.trim() !== ''
      );

      console.log('✅ Loaded categories:', validCategories.length);
      setCategories(validCategories);
      
      // Set root categories as current level
      const rootCategories = validCategories.filter(cat => !cat.parent_ebay_category_id);
      setCurrentLevel(rootCategories);
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

  const buildSelectedPath = (categoryId: string) => {
    if (!categoryId) return;

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
  };

  const handleCategorySelect = (category: EbayCategory) => {
    console.log('🔄 Category selected:', category.category_name, 'Leaf:', category.leaf_category);
    
    const newPath = [...selectedPath, category];
    setSelectedPath(newPath);

    if (category.leaf_category) {
      // This is a final selectable category
      const pathString = newPath.map(cat => cat.category_name).join(' > ');
      console.log('✅ Final category selected:', { categoryId: category.ebay_category_id, pathString });
      
      onChange(category.ebay_category_id, pathString);
      setOpen(false);
    } else {
      // Show children of selected category
      const children = categories.filter(cat => cat.parent_ebay_category_id === category.ebay_category_id);
      setCurrentLevel(children);
    }
  };

  const handleUseThisCategory = (category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    const pathString = newPath.map(cat => cat.category_name).join(' > ');
    console.log('✅ Using non-leaf category:', { categoryId: category.ebay_category_id, pathString });
    
    onChange(category.ebay_category_id, pathString);
    setOpen(false);
  };

  const handleGoBack = () => {
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
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const filtered = categories.filter(cat => 
        cat.category_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);

      // Enhance with full paths
      const enhancedResults = await Promise.all(filtered.map(async (category) => {
        const fullPath = await getCategoryPath(category.ebay_category_id);
        return { ...category, fullPath };
      }));

      setSearchResults(enhancedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const getCategoryPath = async (categoryId: string): Promise<string> => {
    try {
      const path: string[] = [];
      let currentCat = categories.find(cat => cat.ebay_category_id === categoryId);
      
      while (currentCat) {
        path.unshift(currentCat.category_name);
        if (currentCat.parent_ebay_category_id) {
          currentCat = categories.find(cat => cat.ebay_category_id === currentCat!.parent_ebay_category_id);
        } else {
          break;
        }
      }
      
      return path.join(' > ');
    } catch {
      return '';
    }
  };

  const handleSearchResultSelect = (category: EbayCategory & { fullPath?: string }) => {
    if (category.leaf_category) {
      console.log('✅ Search result selected (leaf):', { categoryId: category.ebay_category_id, fullPath: category.fullPath });
      onChange(category.ebay_category_id, category.fullPath || category.category_name);
      setOpen(false);
    } else {
      // Navigate to this category
      buildSelectedPath(category.ebay_category_id);
    }
    
    setSearchQuery('');
    setSearchResults([]);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="w-full justify-between font-normal"
          onClick={() => setOpen(true)}
        >
          <span className="truncate text-left">{getDisplayValue()}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <CommandInput
                placeholder="Search categories..."
                value={searchQuery}
                onValueChange={handleSearch}
                className="pl-8"
              />
            </div>
          </div>

          <CommandList className="max-h-80">
            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <CommandGroup heading="Search Results">
                {searchResults.map((category) => (
                  <CommandItem
                    key={`search-${category.ebay_category_id}`}
                    onSelect={() => handleSearchResultSelect(category)}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{category.category_name}</span>
                      {category.leaf_category && (
                        <Check className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    {(category as any).fullPath && (
                      <span className="text-xs text-muted-foreground">
                        {(category as any).fullPath}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Breadcrumb and Back Button */}
            {!searchQuery && selectedPath.length > 0 && (
              <div className="border-b px-3 py-2 bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <button onClick={() => {
                    setSelectedPath([]);
                    const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
                    setCurrentLevel(rootCategories);
                  }} className="hover:underline">
                    Root
                  </button>
                  {selectedPath.map((cat, index) => (
                    <span key={cat.ebay_category_id}>
                      {' > '}
                      <button 
                        onClick={() => {
                          const newPath = selectedPath.slice(0, index + 1);
                          setSelectedPath(newPath);
                          const children = categories.filter(c => c.parent_ebay_category_id === cat.ebay_category_id);
                          setCurrentLevel(children);
                        }}
                        className="hover:underline"
                      >
                        {cat.category_name}
                      </button>
                    </span>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="h-6 px-2 text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              </div>
            )}

            {/* Current Level Categories */}
            {!searchQuery && (
              <CommandGroup 
                heading={selectedPath.length === 0 ? 'Select Category' : 'Select Subcategory'}
              >
                {currentLevel.length === 0 ? (
                  <CommandEmpty>No categories found</CommandEmpty>
                ) : (
                  currentLevel.map((category) => (
                    <div key={category.ebay_category_id}>
                      <CommandItem
                        onSelect={() => handleCategorySelect(category)}
                        className="flex items-center justify-between py-3"
                      >
                        <span className="flex-1">{category.category_name}</span>
                        <div className="flex items-center gap-2">
                          {category.leaf_category ? (
                            <span className="text-xs text-green-600 font-medium">✓ Final</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Has subcategories</span>
                          )}
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </CommandItem>
                      
                      {/* Use This Category option for non-leaf categories */}
                      {!category.leaf_category && (
                        <div className="px-3 pb-1">
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
                  ))
                )}
              </CommandGroup>
            )}

            {/* Clear Selection */}
            {selectedPath.length > 0 && !searchQuery && (
              <div className="border-t p-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedPath([]);
                    const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
                    setCurrentLevel(rootCategories);
                    onChange('', '');
                    setOpen(false);
                  }}
                  className="w-full text-muted-foreground"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EbayCategorySelector;