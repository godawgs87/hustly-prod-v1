import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, ArrowLeft, Check, X } from 'lucide-react';
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
}

const EbayCategorySelector = ({ value, onChange, disabled }: EbayCategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<EbayCategory[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  // Filter categories based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories([]);
      return;
    }

    const filtered = categories.filter(cat => 
      cat.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50);
    
    setFilteredCategories(filtered);
  }, [searchQuery, categories]);

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
      setSearchQuery('');
      setFilteredCategories([]);
    } else {
      // Show children of selected category
      const children = categories.filter(cat => cat.parent_ebay_category_id === category.ebay_category_id);
      setCurrentLevel(children);
      setSearchQuery('');
      setFilteredCategories([]);
    }
  };

  const handleUseThisCategory = (category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    const pathString = newPath.map(cat => cat.category_name).join(' > ');
    console.log('✅ Using non-leaf category:', { categoryId: category.ebay_category_id, pathString });
    
    onChange(category.ebay_category_id, pathString);
    setOpen(false);
    setSearchQuery('');
    setFilteredCategories([]);
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

  const navigateToCategory = (category: EbayCategory, index: number) => {
    const newPath = selectedPath.slice(0, index + 1);
    setSelectedPath(newPath);
    const children = categories.filter(c => c.parent_ebay_category_id === category.ebay_category_id);
    setCurrentLevel(children);
    setSearchQuery('');
    setFilteredCategories([]);
  };

  const resetToRoot = () => {
    setSelectedPath([]);
    const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
    setCurrentLevel(rootCategories);
    setSearchQuery('');
    setFilteredCategories([]);
  };

  const clearSelection = () => {
    resetToRoot();
    onChange('', '');
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (selectedPath.length === 0) return "Select eBay Category";
    return selectedPath.map(cat => cat.category_name).join(' > ');
  };

  const getCategoryPath = (category: EbayCategory): string => {
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
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        Loading categories...
        <ChevronDown className="h-4 w-4" />
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus={!isMobile}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilteredCategories([]);
              }}
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
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No categories found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                  Search Results ({filteredCategories.length})
                </div>
                {filteredCategories.map((category) => (
                  <div
                    key={category.ebay_category_id}
                    onClick={() => handleCategorySelect(category)}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.category_name}</span>
                      {category.leaf_category && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Final
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getCategoryPath(category)}
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
                No categories found
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground px-3 py-2">
                  {selectedPath.length === 0 ? 'Categories' : 'Subcategories'}
                </div>
                {currentLevel.map((category) => (
                  <div key={category.ebay_category_id} className="space-y-1">
                    <div
                      onClick={() => handleCategorySelect(category)}
                      className="p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border"
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
                              <span className="text-xs text-muted-foreground">View subcategories</span>
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
        
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Select eBay Category</SheetTitle>
          </SheetHeader>
          <div className="h-full">
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
      
      <DialogContent className="max-w-2xl h-[600px] p-0">
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