import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';
import type { PlatformCategory } from '@/types/platform';

interface PlatformCategorySelectorProps {
  platformId: string;
  value?: string | null;
  onChange: (categoryId: string, categoryPath: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface CategoryNode {
  id: string;
  name: string;
  parentId?: string | null;
  isLeaf: boolean;
  path?: string;
  level?: number;
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

const PlatformCategorySelector = ({ 
  platformId,
  value, 
  onChange, 
  disabled, 
  open: externalOpen, 
  onOpenChange 
}: PlatformCategorySelectorProps) => {
  const [rootCategories, setRootCategories] = useState<CategoryNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<CategoryNode[]>([]);
  const [currentLevel, setCurrentLevel] = useState<CategoryNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CategoryNode[]>([]);
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
  const [childrenCache, setChildrenCache] = useState<Map<string, CategoryNode[]>>(new Map());

  const adapter = platformRegistry.get(platformId);
  
  if (!adapter) {
    return null;
  }

  // Load root categories
  const loadRootCategories = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Loading root categories for ${platformId}...`);
      
      // Get categories from the adapter
      const categories = await adapter.getCategories();
      
      // Filter for root categories (no parent)
      const roots = categories
        .filter(cat => !cat.parentId)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          parentId: cat.parentId,
          isLeaf: cat.isLeaf || false,
          path: cat.name
        }));

      setRootCategories(roots);
      setCurrentLevel(roots);
      console.log(`✅ Loaded ${roots.length} root categories for ${platformId}`);
    } catch (error) {
      console.error(`❌ Error loading categories for ${platformId}:`, error);
      toast({
        title: "Error loading categories",
        description: "Failed to load category list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load child categories
  const loadChildCategories = async (parentId: string): Promise<CategoryNode[]> => {
    // Check cache first
    if (childrenCache.has(parentId)) {
      return childrenCache.get(parentId) || [];
    }

    try {
      const categories = await adapter.getCategories(parentId);
      
      const children = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        isLeaf: cat.isLeaf || false,
        path: cat.name
      }));

      // Update cache
      setChildrenCache(prev => new Map(prev).set(parentId, children));
      
      return children;
    } catch (error) {
      console.error(`Error loading child categories for ${parentId}:`, error);
      return [];
    }
  };

  // Search categories
  const searchCategories = async () => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      
      const results = await adapter.searchCategories(debouncedSearchQuery);
      
      const mappedResults = results.map(cat => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        isLeaf: cat.isLeaf || false,
        path: cat.path || cat.name
      }));

      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error searching categories:', error);
      toast({
        title: "Search failed",
        description: "Failed to search categories. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle category selection
  const handleCategoryClick = async (category: CategoryNode) => {
    if (category.isLeaf) {
      // Build the full path
      const fullPath = [...selectedPath, category].map(c => c.name).join(' > ');
      onChange(category.id, fullPath);
      setOpen(false);
      setSearchQuery('');
      return;
    }

    // Load children
    setLoadingChildren(prev => new Set(prev).add(category.id));
    
    try {
      const children = await loadChildCategories(category.id);
      
      if (children.length > 0) {
        setSelectedPath([...selectedPath, category]);
        setCurrentLevel(children);
      } else {
        // No children, treat as leaf
        const fullPath = [...selectedPath, category].map(c => c.name).join(' > ');
        onChange(category.id, fullPath);
        setOpen(false);
        setSearchQuery('');
      }
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(category.id);
        return newSet;
      });
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (selectedPath.length === 0) return;
    
    const newPath = selectedPath.slice(0, -1);
    setSelectedPath(newPath);
    
    if (newPath.length === 0) {
      setCurrentLevel(rootCategories);
    } else {
      // Load parent's children from cache
      const parentId = newPath[newPath.length - 1].id;
      const cached = childrenCache.get(parentId);
      if (cached) {
        setCurrentLevel(cached);
      }
    }
  };

  // Load root categories on mount
  useEffect(() => {
    if (open) {
      loadRootCategories();
    }
  }, [open, platformId]);

  // Search when query changes
  useEffect(() => {
    searchCategories();
  }, [debouncedSearchQuery]);

  const renderContent = () => (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={`Search ${adapter.name} categories...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Navigation Path */}
      {selectedPath.length > 0 && !searchQuery && (
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm">
            {selectedPath.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
                <span className="font-medium">{item.name}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : searchQuery && searchLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : searchQuery && searchResults.length > 0 ? (
          <div className="p-2">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  onChange(result.id, result.path || result.name);
                  setOpen(false);
                  setSearchQuery('');
                }}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    {result.path && (
                      <div className="text-xs text-gray-500 mt-1">{result.path}</div>
                    )}
                  </div>
                  {result.isLeaf && (
                    <Badge variant="secondary" className="ml-2">
                      Leaf
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : searchQuery && searchResults.length === 0 && !searchLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <X className="w-8 h-8 mb-2" />
            <p>No categories found</p>
          </div>
        ) : (
          <div className="p-2">
            {currentLevel.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                disabled={loadingChildren.has(category.id)}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    {category.isLeaf && (
                      <Badge variant="secondary">Leaf</Badge>
                    )}
                    {loadingChildren.has(category.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : !category.isLeaf ? (
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const trigger = (
    <Button
      variant="outline"
      disabled={disabled}
      className="w-full justify-between"
    >
      <span className="truncate">
        {value ? `Category: ${value}` : `Select ${adapter.name} Category`}
      </span>
      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{adapter.name} Category Selection</SheetTitle>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{adapter.name} Category Selection</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default PlatformCategorySelector;
