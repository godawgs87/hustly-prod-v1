import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Loader2, CheckCircle2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { categoryManager, CategoryManager } from '@/services/category/CategoryManager';
import { UniversalCategory } from '@/services/category/ICategoryService';
import { Platform } from '@/services/CategoryMappingService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UniversalCategorySelectorProps {
  platforms: Platform[];
  currentCategories: Record<Platform, { categoryId?: string; categoryPath?: string }>;
  onCategorySelect: (platform: Platform, category: UniversalCategory) => void;
  disabled?: boolean;
  className?: string;
}

const UniversalCategorySelector = ({ 
  platforms,
  currentCategories,
  onCategorySelect,
  disabled,
  className
}: UniversalCategorySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(platforms[0]);
  const [categories, setCategories] = useState<Record<Platform, UniversalCategory[]>>({} as any);
  const [currentLevel, setCurrentLevel] = useState<UniversalCategory[]>([]);
  const [selectedPath, setSelectedPath] = useState<UniversalCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UniversalCategory[]>([]);
  const { toast } = useToast();

  // Load categories when component mounts or platform changes
  useEffect(() => {
    loadCategoriesForPlatform(selectedPlatform);
  }, [selectedPlatform]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedPlatform]);

  const loadCategoriesForPlatform = async (platform: Platform) => {
    if (categories[platform]) {
      setCurrentLevel(categories[platform]);
      return;
    }

    setLoading(true);
    try {
      const rootCategories = await categoryManager.getRootCategories(platform);
      
      setCategories(prev => ({
        ...prev,
        [platform]: rootCategories
      }));
      
      setCurrentLevel(rootCategories);
      setSelectedPath([]);
    } catch (error) {
      console.error(`Error loading ${platform} categories:`, error);
      toast({
        title: "Loading Failed",
        description: `Could not load ${platform} categories`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      const results = await categoryManager.searchCategories(selectedPlatform, query, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCategorySelect = async (category: UniversalCategory) => {
    if (category.isLeaf) {
      // Final selection
      onCategorySelect(selectedPlatform, category);
      setOpen(false);
      setSearchQuery('');
      return;
    }

    // Load children for non-leaf categories
    try {
      const children = await categoryManager.getChildCategories(selectedPlatform, category.id);
      const newPath = [...selectedPath, category];
      
      setSelectedPath(newPath);
      setCurrentLevel(children);
      setSearchQuery(''); // Clear search when navigating
    } catch (error) {
      console.error('Error loading child categories:', error);
      toast({
        title: "Loading Failed",
        description: "Could not load subcategories",
        variant: "destructive"
      });
    }
  };

  const handleLevelSelect = async (levelIndex: number) => {
    if (levelIndex === -1) {
      // Go to root
      setSelectedPath([]);
      setCurrentLevel(categories[selectedPlatform] || []);
      return;
    }

    const newPath = selectedPath.slice(0, levelIndex + 1);
    setSelectedPath(newPath);
    
    const selectedCategory = newPath[levelIndex];
    if (!selectedCategory.isLeaf) {
      const children = await categoryManager.getChildCategories(selectedPlatform, selectedCategory.id);
      setCurrentLevel(children);
    }
  };

  const getCurrentSelection = (platform: Platform) => {
    const current = currentCategories[platform];
    return current?.categoryPath || 'Select category';
  };

  const getPlatformName = (platform: Platform): string => {
    const names: Record<Platform, string> = {
      ebay: 'eBay',
      mercari: 'Mercari',
      poshmark: 'Poshmark',
      depop: 'Depop',
      facebook: 'Facebook'
    };
    return names[platform];
  };

  const getCompletedCount = () => {
    return platforms.filter(platform => {
      const current = currentCategories[platform];
      return current?.categoryId && current.categoryId.length > 0;
    }).length;
  };

  const displayCategories = searchQuery.trim() ? searchResults : currentLevel;

  return (
    <div className={className}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left flex-1">
              Select Platform Categories
            </span>
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="secondary" className="text-xs">
                {getCompletedCount()}/{platforms.length}
              </Badge>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </div>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Platform Categories</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Platform Tabs */}
            <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as Platform)}>
              <TabsList className="grid w-full grid-cols-4">
                {platforms.map((platform) => {
                  const isSelected = currentCategories[platform]?.categoryId;
                  return (
                    <TabsTrigger 
                      key={platform} 
                      value={platform}
                      className={cn(
                        "flex items-center gap-2",
                        isSelected && "bg-green-100 text-green-800"
                      )}
                    >
                      {getPlatformName(platform)}
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {platforms.map((platform) => (
                <TabsContent key={platform} value={platform} className="flex-1 overflow-hidden flex flex-col space-y-4">
                  {/* Current Selection */}
                  {currentCategories[platform]?.categoryPath && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-700">Current Selection:</div>
                      <div className="text-sm text-muted-foreground">{currentCategories[platform].categoryPath}</div>
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${getPlatformName(platform)} categories...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Breadcrumb */}
                  {selectedPath.length > 0 && !searchQuery.trim() && (
                    <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <button 
                        onClick={() => handleLevelSelect(-1)}
                        className="hover:text-foreground hover:underline"
                      >
                        Root
                      </button>
                      {selectedPath.map((cat, index) => (
                        <React.Fragment key={cat.id}>
                          <span>/</span>
                          <button 
                            onClick={() => handleLevelSelect(index)}
                            className="hover:text-foreground hover:underline"
                          >
                            {cat.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Categories List */}
                  <div className="flex-1 overflow-hidden">
                    {loading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading categories...
                      </div>
                    ) : (
                      <Command className="h-full">
                        <CommandList className="max-h-none">
                          {displayCategories.length === 0 ? (
                            <CommandEmpty>
                              {searchQuery ? 'No categories found' : 'No categories available'}
                            </CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {displayCategories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => handleCategorySelect(category)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex-1">
                                    <span>{category.name}</span>
                                    {searchQuery && category.fullPath && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {category.fullPath}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {category.isLeaf ? (
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
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UniversalCategorySelector;