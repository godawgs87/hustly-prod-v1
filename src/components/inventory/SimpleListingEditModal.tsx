import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ListingImagePreview from '@/components/ListingImagePreview';
import EditableCategoryCell from '@/components/listings/table-row/cells/EditableCategoryCell';
import { ListingService } from '@/services/ListingService';

import type { Listing } from '@/types/Listing';

interface SimpleListingEditModalProps {
  listing: Listing;
  onClose: () => void;
  onSave?: () => void;
}

const SimpleListingEditModal = ({ listing, onClose, onSave }: SimpleListingEditModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: listing.title || '',
    description: listing.description || '',
    price: listing.price || 0,
    shipping_cost: listing.shipping_cost || 9.95,
    condition: listing.condition || '',
    category: listing.category || '',
    ebay_category_id: listing.ebay_category_id || '',
    ebay_category_path: listing.ebay_category_path || '',
    status: listing.status || 'draft',
    brand: (listing as any).brand || '',
    color_primary: (listing as any).color_primary || '',
    material: (listing as any).material || '',
    size_value: (listing as any).size_value || '',
    gender: listing.gender || '',
    age_group: listing.age_group || '',
    clothing_size: listing.clothing_size || '',
    shoe_size: listing.shoe_size || '',
    source_type: listing.source_type || '',
    source_location: listing.source_location || '',
    purchase_price: listing.purchase_price || 0,
    purchase_date: listing.purchase_date || '',
    performance_notes: listing.performance_notes || '',
    measurements: listing.measurements || {}
  });

  const handleInputChange = (field: string, value: any) => {
    console.log('📝 Field updated:', { field, value, type: typeof value });
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleSave = async () => {
    console.log('💾 Starting save operation...', { listingId: listing.id, formData });
    setSaving(true);
    
    try {
      // Validation
      const errors = [];
      if (!formData.title?.trim()) errors.push('Title is required');
      if (!formData.price || formData.price <= 0) errors.push('Valid price is required');
      if (!formData.condition?.trim()) errors.push('Condition is required');
      
      if (errors.length > 0) {
        console.error('❌ Validation failed:', errors);
        toast({
          title: "Validation Error",
          description: errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      const updates: Partial<Listing> = {
        ...formData,
        // Handle null values for optional enum fields
        gender: (formData.gender === '' || formData.gender === 'none') ? null : formData.gender as any,
        age_group: (formData.age_group === '' || formData.age_group === 'none') ? null : formData.age_group as any,
        // Ensure numeric values
        price: Number(formData.price),
        shipping_cost: Number(formData.shipping_cost),
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        // Handle date
        purchase_date: formData.purchase_date || null
      };

      console.log('🔄 Prepared updates:', updates);

      const success = await ListingService.updateListing(listing.id, updates);
      if (success) {
        console.log('✅ Save successful, closing modal');
        toast({
          title: "Success",
          description: "Listing updated successfully"
        });
        onSave?.();
        onClose();
      } else {
        console.error('❌ Save returned false');
      }
    } catch (error) {
      console.error('❌ Save failed with exception:', error);
      toast({
        title: "Error",
        description: "Failed to save listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold mb-2">Edit Listing</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{listing.id.substring(0, 8)}</Badge>
              <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                {listing.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Image and Basic Info */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListingImagePreview 
                    photos={listing.photos} 
                    title={listing.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status & Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">eBay Category</label>
                    <EditableCategoryCell
                      category={formData.category}
                      ebayCategory={formData.ebay_category_id}
                      ebayPath={formData.ebay_category_path}
                      onSave={(categoryId, categoryPath) => {
                        console.log('🔄 Category selected in modal:', { categoryId, categoryPath });
                        handleInputChange('ebay_category_id', categoryId);
                        handleInputChange('ebay_category_path', categoryPath);
                        // Update legacy category field for backward compatibility
                        const firstCategory = categoryPath.split(' > ')[0] || '';
                        handleInputChange('category', firstCategory);
                        console.log('✅ Category form data updated:', { 
                          ebay_category_id: categoryId, 
                          ebay_category_path: categoryPath,
                          category: firstCategory 
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Condition</label>
                    <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                      <SelectTrigger>
                        <SelectValue />
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
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Main Content */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Listing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Item title"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Item description"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Price ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Shipping ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.shipping_cost}
                        onChange={(e) => handleInputChange('shipping_cost', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Item Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Brand</label>
                      <Input
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                        placeholder="Brand"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Color</label>
                      <Input
                        value={formData.color_primary}
                        onChange={(e) => handleInputChange('color_primary', e.target.value)}
                        placeholder="Primary color"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Material</label>
                      <Input
                        value={formData.material}
                        onChange={(e) => handleInputChange('material', e.target.value)}
                        placeholder="Material"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Size</label>
                      <Input
                        value={formData.size_value}
                        onChange={(e) => handleInputChange('size_value', e.target.value)}
                        placeholder="Size"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Additional Details */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Size Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Gender</label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No preference</SelectItem>
                        <SelectItem value="Men">Men</SelectItem>
                        <SelectItem value="Women">Women</SelectItem>
                        <SelectItem value="Kids">Kids</SelectItem>
                        <SelectItem value="Unisex">Unisex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Age Group</label>
                    <Select value={formData.age_group} onValueChange={(value) => handleInputChange('age_group', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select age group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No preference</SelectItem>
                        <SelectItem value="Adult">Adult</SelectItem>
                        <SelectItem value="Youth">Youth</SelectItem>
                        <SelectItem value="Toddler">Toddler</SelectItem>
                        <SelectItem value="Baby">Baby</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Clothing Size</label>
                      <Input
                        value={formData.clothing_size}
                        onChange={(e) => handleInputChange('clothing_size', e.target.value)}
                        placeholder="e.g., M, L, XL"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Shoe Size</label>
                      <Input
                        value={formData.shoe_size}
                        onChange={(e) => handleInputChange('shoe_size', e.target.value)}
                        placeholder="e.g., 9, 10.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Source Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Source Type</label>
                    <Select value={formData.source_type} onValueChange={(value) => handleInputChange('source_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Thrift Store">Thrift Store</SelectItem>
                        <SelectItem value="Estate Sale">Estate Sale</SelectItem>
                        <SelectItem value="Garage Sale">Garage Sale</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Auction">Auction</SelectItem>
                        <SelectItem value="Consignment">Consignment</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Source Location</label>
                    <Input
                      value={formData.source_location}
                      onChange={(e) => handleInputChange('source_location', e.target.value)}
                      placeholder="Store/location name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Purchase Price ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.purchase_price}
                        onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Purchase Date</label>
                      <Input
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Measurements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Length</label>
                      <Input
                        value={(formData.measurements as any)?.length || ''}
                        onChange={(e) => handleMeasurementChange('length', e.target.value)}
                        placeholder="Length"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Width</label>
                      <Input
                        value={(formData.measurements as any)?.width || ''}
                        onChange={(e) => handleMeasurementChange('width', e.target.value)}
                        placeholder="Width"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Height</label>
                      <Input
                        value={(formData.measurements as any)?.height || ''}
                        onChange={(e) => handleMeasurementChange('height', e.target.value)}
                        placeholder="Height"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Weight</label>
                      <Input
                        value={(formData.measurements as any)?.weight || ''}
                        onChange={(e) => handleMeasurementChange('weight', e.target.value)}
                        placeholder="Weight"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.performance_notes}
                    onChange={(e) => handleInputChange('performance_notes', e.target.value)}
                    placeholder="Performance notes, observations, etc."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleListingEditModal;