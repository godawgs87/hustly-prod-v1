import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import InlineEditableField from './InlineEditableField';
import PlatformCategorySection from '../PlatformCategorySection';
import { CategoryMappingService } from '@/services/CategoryMappingService';
import { EnhancedCategoryMappingService } from '@/services/category/EnhancedCategoryMappingService';
import { ListingData } from '@/types/CreateListing';

interface BasicInformationSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const BasicInformationSection = ({ listingData, onUpdate }: BasicInformationSectionProps) => {
  // Map AI condition values to UI dropdown values
  const mapConditionValue = (condition: string | null | undefined): string => {
    if (!condition) return '';
    
    const conditionMapping: { [key: string]: string } = {
      'Excellent': 'Like New',
      'Very Good': 'Like New',
      'Good': 'Used',
      'Fair': 'Fair',
      'Poor': 'Poor',
      'New': 'New',
      'Like New': 'Like New',
      'Used': 'Used',
      'For Parts': 'For Parts'
    };
    
    return conditionMapping[condition] || condition;
  };
  // Auto-apply category suggestions when internal category changes
  useEffect(() => {
    if (listingData.category && (!listingData.ebay_category_id)) {
      autoApplyCategorySuggestions();
    }
  }, [listingData.category]);

  const autoApplyCategorySuggestions = async () => {
    if (!listingData.category) return;
    
    const suggestions = await EnhancedCategoryMappingService.autoApplySmartCategories(
      listingData.category,
      listingData.title,
      listingData.description
    );
    
    const updates: Partial<ListingData> = {};
    
    if (suggestions.ebay) {
      updates.ebay_category_id = suggestions.ebay.categoryId;
      updates.ebay_category_path = suggestions.ebay.categoryPath;
    }
    if (suggestions.mercari) {
      updates.mercari_category_id = suggestions.mercari.categoryId;
      updates.mercari_category_path = suggestions.mercari.categoryPath;
    }
    if (suggestions.poshmark) {
      updates.poshmark_category_id = suggestions.poshmark.categoryId;
      updates.poshmark_category_path = suggestions.poshmark.categoryPath;
    }
    if (suggestions.depop) {
      updates.depop_category_id = suggestions.depop.categoryId;
      updates.depop_category_path = suggestions.depop.categoryPath;
    }
    if (suggestions.facebook) {
      updates.facebook_category_id = suggestions.facebook.categoryId;
      updates.facebook_category_path = suggestions.facebook.categoryPath;
    }
    
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        <div className="space-y-6">
          <div>
            <InlineEditableField
              label="Title"
              value={listingData.title}
              onSave={(value) => onUpdate({ title: value as string })}
              className="text-lg font-medium"
            />
          </div>

          <div>
            <InlineEditableField
              label="Description"
              value={listingData.description}
              onSave={(value) => onUpdate({ description: value as string })}
              type="textarea"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Category
              </label>
              <Select 
                value={typeof listingData.category === 'object' && listingData.category
                  ? (listingData.category as any).primary || ''
                  : listingData.category || ''} 
                onValueChange={(value) => onUpdate({ category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Shoes">Shoes</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                  <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                  <SelectItem value="Automotive">Automotive</SelectItem>
                  <SelectItem value="Tools & Hardware">Tools & Hardware</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Toys & Games">Toys & Games</SelectItem>
                  <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                  <SelectItem value="Music & Instruments">Music & Instruments</SelectItem>
                  <SelectItem value="Art & Collectibles">Art & Collectibles</SelectItem>
                  <SelectItem value="Jewelry & Watches">Jewelry & Watches</SelectItem>
                  <SelectItem value="Pet Supplies">Pet Supplies</SelectItem>
                  <SelectItem value="Baby & Kids">Baby & Kids</SelectItem>
                  <SelectItem value="Office & Industrial">Office & Industrial</SelectItem>
                  <SelectItem value="Crafts & Hobbies">Crafts & Hobbies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <Select 
                value={mapConditionValue(listingData.condition)} 
                onValueChange={(value) => onUpdate({ condition: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Like New">Like New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="For Parts">For Parts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <InlineEditableField
              label="Price ($)"
              value={listingData.price || 0}
              onSave={(value) => onUpdate({ price: parseFloat(value.toString()) || 0 })}
              type="number"
              displayClassName="text-xl font-bold text-green-600"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Platform Categories</h3>
          <div className="h-px bg-border flex-1" />
        </div>
        
        <PlatformCategorySection
          platform="ebay"
          platformName="eBay"
          internalCategory={typeof listingData.category === 'object' && listingData.category
            ? (listingData.category as any).primary || ''
            : listingData.category || ''}
          currentCategoryId={listingData.ebay_category_id}
          currentCategoryPath={listingData.ebay_category_path}
          title={listingData.title}
          description={listingData.description}
          onCategoryChange={(categoryId, categoryPath) => {
            onUpdate({ 
              ebay_category_id: categoryId,
              ebay_category_path: categoryPath 
            });
          }}
          isRequired={true}
        />

        <PlatformCategorySection
          platform="mercari"
          platformName="Mercari"
          internalCategory={typeof listingData.category === 'object' && listingData.category
            ? (listingData.category as any).primary || ''
            : listingData.category || ''}
          currentCategoryId={listingData.mercari_category_id}
          currentCategoryPath={listingData.mercari_category_path}
          title={listingData.title}
          description={listingData.description}
          onCategoryChange={(categoryId, categoryPath) => {
            onUpdate({ 
              mercari_category_id: categoryId,
              mercari_category_path: categoryPath 
            });
          }}
        />

        <PlatformCategorySection
          platform="poshmark"
          platformName="Poshmark"
          internalCategory={typeof listingData.category === 'object' && listingData.category
            ? (listingData.category as any).primary || ''
            : listingData.category || ''}
          currentCategoryId={listingData.poshmark_category_id}
          currentCategoryPath={listingData.poshmark_category_path}
          title={listingData.title}
          description={listingData.description}
          onCategoryChange={(categoryId, categoryPath) => {
            onUpdate({ 
              poshmark_category_id: categoryId,
              poshmark_category_path: categoryPath 
            });
          }}
        />

        <PlatformCategorySection
          platform="depop"
          platformName="Depop"
          internalCategory={typeof listingData.category === 'object' && listingData.category
            ? (listingData.category as any).primary || ''
            : listingData.category || ''}
          currentCategoryId={listingData.depop_category_id}
          currentCategoryPath={listingData.depop_category_path}
          title={listingData.title}
          description={listingData.description}
          onCategoryChange={(categoryId, categoryPath) => {
            onUpdate({ 
              depop_category_id: categoryId,
              depop_category_path: categoryPath 
            });
          }}
        />

        <PlatformCategorySection
          platform="facebook"
          platformName="Facebook Marketplace"
          internalCategory={typeof listingData.category === 'object' && listingData.category
            ? (listingData.category as any).primary || ''
            : listingData.category || ''}
          currentCategoryId={listingData.facebook_category_id}
          currentCategoryPath={listingData.facebook_category_path}
          title={listingData.title}
          description={listingData.description}
          onCategoryChange={(categoryId, categoryPath) => {
            onUpdate({ 
              facebook_category_id: categoryId,
              facebook_category_path: categoryPath 
            });
          }}
        />
      </div>
    </div>
  );
};

export default BasicInformationSection;
