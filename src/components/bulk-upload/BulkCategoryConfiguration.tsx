import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import MultiPlatformCategorySelector from '@/components/enhanced-category/MultiPlatformCategorySelector';
import { CategoryMappingService, Platform } from '@/services/CategoryMappingService';
import { useToast } from '@/hooks/use-toast';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkCategoryConfigurationProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithCategories: PhotoGroup[]) => void;
  onBack: () => void;
  onUpdateGroup: (group: PhotoGroup) => void;
}

const BulkCategoryConfiguration = ({
  photoGroups,
  onComplete,
  onBack,
  onUpdateGroup
}: BulkCategoryConfigurationProps) => {
  const { toast } = useToast();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isAutoApplying, setIsAutoApplying] = useState(false);

  const currentGroup = photoGroups[currentGroupIndex];
  const isLastGroup = currentGroupIndex === photoGroups.length - 1;

  const handleCategoryChange = (platform: Platform, categoryId: string, categoryPath: string) => {
    if (!currentGroup?.listingData) return;

    const updatedGroup = {
      ...currentGroup,
      listingData: {
        ...currentGroup.listingData,
        [`${platform}_category_id`]: categoryId,
        [`${platform}_category_path`]: categoryPath,
      }
    };

    onUpdateGroup(updatedGroup);
  };

  const handleNext = () => {
    if (isLastGroup) {
      onComplete(photoGroups);
    } else {
      setCurrentGroupIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const handleAutoApplyAll = async () => {
    setIsAutoApplying(true);
    try {
      let appliedCount = 0;
      
      for (const group of photoGroups) {
        if (group.listingData?.category) {
          const suggestions = await CategoryMappingService.autoApplyCategories(group.listingData.category);
          
          if (suggestions.ebay) {
            const updatedGroup = {
              ...group,
              listingData: {
                ...group.listingData,
                ebay_category_id: suggestions.ebay.categoryId,
                ebay_category_path: suggestions.ebay.categoryPath,
              }
            };
            onUpdateGroup(updatedGroup);
            appliedCount++;
          }
        }
      }

      if (appliedCount > 0) {
        toast({
          title: "Categories Applied",
          description: `Auto-applied categories to ${appliedCount} items based on previous selections.`,
        });
      } else {
        toast({
          title: "No Suggestions Available",
          description: "No category suggestions found. Please select categories manually.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error auto-applying categories:', error);
      toast({
        title: "Auto-apply Failed",
        description: "Could not apply category suggestions. Please select manually.",
        variant: "destructive"
      });
    } finally {
      setIsAutoApplying(false);
    }
  };

  const getCategorizedCount = () => {
    return photoGroups.filter(group => 
      group.listingData?.ebay_category_id && group.listingData.ebay_category_id.length > 0
    ).length;
  };

  const hasCategories = currentGroup?.listingData?.ebay_category_id && 
                       currentGroup.listingData.ebay_category_id.length > 0;

  if (!currentGroup) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">No items found for category configuration.</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Set Platform Categories</CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {getCategorizedCount()}/{photoGroups.length} Categorized
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoApplyAll}
                disabled={isAutoApplying}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isAutoApplying ? 'Applying...' : 'Auto-apply All'}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Item {currentGroupIndex + 1} of {photoGroups.length}: {currentGroup.name}
            </span>
            <span>
              {Math.round(((currentGroupIndex + 1) / photoGroups.length) * 100)}% Complete
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentGroupIndex + 1) / photoGroups.length) * 100}%` }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Current Item Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Preview */}
        <Card className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Item Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentGroup.photos.length > 0 && (
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(currentGroup.photos[0])}
                  alt={currentGroup.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="font-medium truncate">
                {currentGroup.listingData?.title || currentGroup.name}
              </h3>
              {currentGroup.listingData?.category && (
                <p className="text-sm text-muted-foreground">
                  Internal Category: {(() => {
                    const category = currentGroup.listingData.category;
                    if (category && typeof category === 'object' && 'primary' in category) {
                      return String((category as any).primary || '');
                    }
                    return String(category || '');
                  })()}
                </p>
              )}
              {currentGroup.listingData?.price && (
                <p className="text-lg font-semibold text-green-600">
                  ${currentGroup.listingData.price}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <div className="lg:col-span-2">
          <MultiPlatformCategorySelector
            internalCategory={currentGroup.listingData?.category}
            currentCategories={{
              ebay_category_id: currentGroup.listingData?.ebay_category_id,
              ebay_category_path: currentGroup.listingData?.ebay_category_path,
              mercari_category_id: currentGroup.listingData?.mercari_category_id,
              mercari_category_path: currentGroup.listingData?.mercari_category_path,
              poshmark_category_id: currentGroup.listingData?.poshmark_category_id,
              poshmark_category_path: currentGroup.listingData?.poshmark_category_path,
              depop_category_id: currentGroup.listingData?.depop_category_id,
              depop_category_path: currentGroup.listingData?.depop_category_path,
              facebook_category_id: currentGroup.listingData?.facebook_category_id,
              facebook_category_path: currentGroup.listingData?.facebook_category_path,
            }}
            onCategoryChange={handleCategoryChange}
            platforms={['ebay']} // Start with eBay, add others later
            showSuggestions={true}
          />
        </div>
      </div>

      {/* Navigation */}
      <Card className="p-6">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentGroupIndex === 0 ? 'Back to Review' : 'Previous Item'}
          </Button>
          
          <div className="flex items-center gap-4">
            {!hasCategories && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                ⚠️ Category required
              </span>
            )}
            <Button
              onClick={handleNext}
              disabled={!hasCategories}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isLastGroup ? 'Complete Setup' : 'Next Item'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BulkCategoryConfiguration;