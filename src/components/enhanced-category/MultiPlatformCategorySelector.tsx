import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles } from 'lucide-react';
import PlatformCategorySection from '@/components/create-listing/PlatformCategorySection';
import { CategoryMappingService, Platform } from '@/services/CategoryMappingService';
import { useToast } from '@/hooks/use-toast';

interface MultiPlatformCategorySelectorProps {
  internalCategory?: string;
  currentCategories: {
    ebay_category_id?: string;
    ebay_category_path?: string;
    mercari_category_id?: string;
    mercari_category_path?: string;
    poshmark_category_id?: string;
    poshmark_category_path?: string;
    depop_category_id?: string;
    depop_category_path?: string;
    facebook_category_id?: string;
    facebook_category_path?: string;
  };
  onCategoryChange: (platform: Platform, categoryId: string, categoryPath: string) => void;
  platforms?: Platform[];
  showSuggestions?: boolean;
}

const MultiPlatformCategorySelector = ({
  internalCategory,
  currentCategories,
  onCategoryChange,
  platforms = ['ebay', 'mercari', 'poshmark', 'depop'],
  showSuggestions = true
}: MultiPlatformCategorySelectorProps) => {
  const { toast } = useToast();
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<Platform>>(new Set());

  const handleAutoApplyAll = async () => {
    if (!internalCategory) return;

    try {
      const suggestions = await CategoryMappingService.autoApplyCategories(internalCategory);
      let applied = 0;

      for (const [platform, categoryData] of Object.entries(suggestions)) {
        if (categoryData && platforms.includes(platform as Platform)) {
          onCategoryChange(platform as Platform, categoryData.categoryId, categoryData.categoryPath || '');
          setAppliedSuggestions(prev => new Set([...prev, platform as Platform]));
          applied++;
        }
      }

      if (applied > 0) {
        toast({
          title: "Categories Applied",
          description: `Auto-applied ${applied} category suggestions based on previous selections.`,
        });
      }
    } catch (error) {
      console.error('Error auto-applying categories:', error);
      toast({
        title: "Auto-apply Failed",
        description: "Could not apply category suggestions. Please select manually.",
        variant: "destructive"
      });
    }
  };

  const getPlatformName = (platform: Platform): string => {
    const names: Record<Platform, string> = {
      ebay: 'eBay',
      mercari: 'Mercari',
      poshmark: 'Poshmark',
      depop: 'Depop',
      facebook: 'Facebook Marketplace'
    };
    return names[platform];
  };

  const getCurrentCategoryData = (platform: Platform) => {
    const categoryId = currentCategories[`${platform}_category_id` as keyof typeof currentCategories];
    const categoryPath = currentCategories[`${platform}_category_path` as keyof typeof currentCategories];
    return { categoryId, categoryPath };
  };

  const hasAnySuggestions = internalCategory && showSuggestions;
  const completedCount = platforms.filter(platform => {
    const { categoryId } = getCurrentCategoryData(platform);
    return categoryId && categoryId.length > 0;
  }).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Platform Categories
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{platforms.length} Set
            </Badge>
          </CardTitle>
          
          {hasAnySuggestions && (
            <button
              onClick={handleAutoApplyAll}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Auto-apply All
            </button>
          )}
        </div>
        
        {internalCategory && (
          <p className="text-sm text-muted-foreground">
            Setting platform categories for: <span className="font-medium">{internalCategory}</span>
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {platforms.map((platform, index) => {
          const { categoryId, categoryPath } = getCurrentCategoryData(platform);
          
          return (
            <div key={platform}>
              <PlatformCategorySection
                platform={platform}
                platformName={getPlatformName(platform)}
                internalCategory={internalCategory}
                currentCategoryId={categoryId}
                currentCategoryPath={categoryPath}
                onCategoryChange={(catId, catPath) => onCategoryChange(platform, catId, catPath)}
                isRequired={platform === 'ebay'} // eBay is required for now
              />
              
              {index < platforms.length - 1 && <Separator className="mt-4" />}
            </div>
          );
        })}
        
        {completedCount === 0 && (
          <div className="text-center p-6 text-muted-foreground">
            <p className="text-sm">
              Select categories for each platform to enable cross-platform listing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiPlatformCategorySelector;