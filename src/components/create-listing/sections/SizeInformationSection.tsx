
import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListingData } from '@/types/CreateListing';

interface SizeInformationSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const SizeInformationSection = ({ listingData, onUpdate }: SizeInformationSectionProps) => {
  // Check if this category requires size information based on eBay category or fallback text
  const requiresSizeInfo = () => {
    // Check eBay category path first
    if (listingData.ebay_category_path) {
      const pathLower = listingData.ebay_category_path.toLowerCase();
      return pathLower.includes('clothing') || 
             pathLower.includes('apparel') ||
             pathLower.includes('fashion') ||
             pathLower.includes('shoe') || 
             pathLower.includes('footwear') ||
             pathLower.includes('sandal') ||
             pathLower.includes('boot');
    }
    
    // Fallback to old text-based category check
    const categoryText = listingData.category?.toLowerCase() || '';
    return categoryText.includes('clothing') || 
           categoryText.includes('apparel') ||
           categoryText.includes('fashion') ||
           categoryText.includes('shoe') || 
           categoryText.includes('footwear') ||
           categoryText.includes('sandal') ||
           categoryText.includes('boot');
  };

  const isShoeCategory = () => {
    // Check eBay category path first
    if (listingData.ebay_category_path) {
      const pathLower = listingData.ebay_category_path.toLowerCase();
      return pathLower.includes('shoe') ||
             pathLower.includes('footwear') ||
             pathLower.includes('sandal') ||
             pathLower.includes('boot');
    }
    
    const categoryText = listingData.category?.toLowerCase() || '';
    return categoryText.includes('shoe') || 
           categoryText.includes('footwear') ||
           categoryText.includes('sandal') ||
           categoryText.includes('boot');
  };

  const clothingSizes = {
    'Men': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', '44'],
    'Women': ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'],
    'Kids': ['2T', '3T', '4T', '5T', 'XS (4-5)', 'S (6-7)', 'M (8-10)', 'L (12-14)', 'XL (16-18)'],
    'Unisex': ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  };

  const shoeSizes = {
    'Men': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'],
    'Women': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
    'Kids': ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7'],
    'Unisex': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13']
  };

  if (!requiresSizeInfo()) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Size Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="gender">Gender/Target</Label>
          <Select 
            value={listingData.gender || ''} 
            onValueChange={(value) => onUpdate({ gender: value as 'Men' | 'Women' | 'Kids' | 'Unisex' })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Men">Men's</SelectItem>
              <SelectItem value="Women">Women's</SelectItem>
              <SelectItem value="Kids">Kids</SelectItem>
              <SelectItem value="Unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {listingData.gender === 'Kids' && (
          <div>
            <Label htmlFor="age_group">Age Group</Label>
            <Select 
              value={listingData.age_group || ''} 
              onValueChange={(value) => onUpdate({ age_group: value as 'Adult' | 'Youth' | 'Toddler' | 'Baby' })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select age group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Youth">Youth (6-14)</SelectItem>
                <SelectItem value="Toddler">Toddler (2-5)</SelectItem>
                <SelectItem value="Baby">Baby (0-2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isShoeCategory() && listingData.gender && (
          <div>
            <Label htmlFor="clothing_size">Clothing Size</Label>
            <Select 
              value={listingData.clothing_size || ''} 
              onValueChange={(value) => onUpdate({ clothing_size: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {clothingSizes[listingData.gender]?.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isShoeCategory() && listingData.gender && (
          <div>
            <Label htmlFor="shoe_size">Shoe Size</Label>
            <Select 
              value={listingData.shoe_size || ''} 
              onValueChange={(value) => onUpdate({ shoe_size: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {shoeSizes[listingData.gender]?.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SizeInformationSection;
