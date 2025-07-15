
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

interface CategorySelectorProps {
  value?: string | null;
  onChange: (categoryId: string | null, categoryPath?: string) => void;
  placeholder?: string;
  className?: string;
}

const CategorySelector = ({ 
  value, 
  onChange, 
  placeholder = "Select a category",
  className 
}: CategorySelectorProps) => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<EbayCategory[]>([]);
  const [currentLevel, setCurrentLevel] = useState<EbayCategory[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    loadRootCategories();
  }, []);

  React.useEffect(() => {
    if (value && !loading) {
      buildSelectedPath(value);
    }
  }, [value, loading]);

  const loadRootCategories = async () => {
    try {
      const { data, error } = await supabase.rpc('get_root_categories');

      if (error) throw error;

      const validCategories = (data || []).filter(cat => 
        cat.ebay_category_id && cat.category_name
      ).map(cat => ({
        ...cat,
        parent_ebay_category_id: null // Root categories have no parent
      }));

      setCategories(validCategories);
      setCurrentLevel(validCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Loading Failed",
        description: "Could not load categories. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChildCategories = async (parentId: string): Promise<EbayCategory[]> => {
    try {
      const { data, error } = await supabase.rpc('get_child_categories', {
        parent_id: parentId
      });

      if (error) return [];

      return (data || []).filter(cat => 
        cat.ebay_category_id && cat.category_name
      );
    } catch (error) {
      console.error('Error loading child categories:', error);
      return [];
    }
  };

  const buildSelectedPath = async (categoryId: string) => {
    if (!categoryId) return;

    try {
      const { data: selectedCategory, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('ebay_category_id', categoryId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !selectedCategory) return;

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
      
      setSelectedPath(path);
      setCategories(prev => {
        const existingIds = new Set(prev.map(cat => cat.ebay_category_id));
        const newCategories = path.filter(cat => !existingIds.has(cat.ebay_category_id));
        return [...prev, ...newCategories];
      });
      
      if (path.length > 0) {
        const lastSelected = path[path.length - 1];
        if (!lastSelected.leaf_category) {
          const children = await loadChildCategories(lastSelected.ebay_category_id);
          setCurrentLevel(children);
        }
      }
    } catch (error) {
      console.error('Error building category path:', error);
    }
  };

  const handleCategorySelect = async (category: EbayCategory) => {
    const newPath = [...selectedPath, category];
    setSelectedPath(newPath);

    if (category.leaf_category) {
      const pathString = newPath.map(cat => cat.category_name).join(' > ');
      onChange(category.ebay_category_id, pathString);
    } else {
      const children = await loadChildCategories(category.ebay_category_id);
      setCurrentLevel(children);
      onChange(null); // Clear selection until leaf is selected
    }
  };

  const handleLevelSelect = async (levelIndex: number) => {
    const newPath = selectedPath.slice(0, levelIndex + 1);
    setSelectedPath(newPath);
    
    if (levelIndex === -1) {
      const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
      setCurrentLevel(rootCategories);
      onChange(null);
    } else {
      const selectedCategory = newPath[levelIndex];
      if (!selectedCategory.leaf_category) {
        const children = await loadChildCategories(selectedCategory.ebay_category_id);
        setCurrentLevel(children);
      }
      onChange(null);
    }
  };

  const getDisplayValue = () => {
    if (selectedPath.length === 0) return placeholder;
    const lastCategory = selectedPath[selectedPath.length - 1];
    return lastCategory.leaf_category 
      ? selectedPath.map(cat => cat.category_name).join(' > ')
      : placeholder;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="h-10 bg-gray-100 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-80 max-h-96 overflow-y-auto bg-card border shadow-lg z-[60]"
          align="start"
        >
          {selectedPath.length > 0 && (
            <>
              <DropdownMenuLabel>Current Path:</DropdownMenuLabel>
              <div className="px-2 py-1 text-xs text-muted-foreground">
                <button 
                  onClick={() => handleLevelSelect(-1)}
                  className="hover:underline"
                >
                  Root
                </button>
                {selectedPath.map((cat, index) => (
                  <span key={cat.ebay_category_id}>
                    {' > '}
                    <button 
                      onClick={() => handleLevelSelect(index)}
                      className="hover:underline"
                    >
                      {cat.category_name}
                    </button>
                  </span>
                ))}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

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
                <span>{category.category_name}</span>
                {category.leaf_category ? (
                  <span className="text-xs text-muted-foreground">✓</span>
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </DropdownMenuItem>
            ))
          )}

          {selectedPath.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedPath([]);
                  const rootCategories = categories.filter(cat => !cat.parent_ebay_category_id);
                  setCurrentLevel(rootCategories);
                  onChange(null);
                }}
                className="text-muted-foreground"
              >
                Clear Selection
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CategorySelector;
