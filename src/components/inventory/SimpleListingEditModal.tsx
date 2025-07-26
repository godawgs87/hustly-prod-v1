import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save, Loader2, Package, Image, DollarSign, Info } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState("basics");
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
    gender: listing.gender || 'Unisex',
    age_group: listing.age_group || 'Adult',
    clothing_size: listing.clothing_size || '',
    shoe_size: listing.shoe_size || '',
    source_type: listing.source_type || '',
    source_location: listing.source_location || '',
    purchase_price: listing.purchase_price || 0,
    purchase_date: listing.purchase_date || null,
    performance_notes: listing.performance_notes || '',
    measurements: {
      length: listing.measurements?.length || '',
      width: listing.measurements?.width || '',
      height: listing.measurements?.height || '',
      weight: listing.measurements?.weight || '',
      chest: listing.measurements?.chest || '',
      waist: listing.measurements?.waist || '',
      inseam: listing.measurements?.inseam || '',
      sleeve: listing.measurements?.sleeve || '',
      shoulder: listing.measurements?.shoulder || '',
      ...listing.measurements
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ListingService.updateListing(listing.id, formData);
      toast({
        title: "Success",
        description: "Listing updated successfully",
      });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to update listing",
        variant: "destructive",
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="basics" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Shipping</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Listing Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
                            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Shipping ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.shipping_cost}
                            onChange={(e) => handleInputChange('shipping_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
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
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
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
                            <SelectItem value="Men">Men</SelectItem>
                            <SelectItem value="Women">Women</SelectItem>
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
                            <SelectItem value="Adult">Adult</SelectItem>
                            <SelectItem value="Kids">Kids</SelectItem>
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
                </div>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Debug Info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
                        Photos: {listing.photos ? listing.photos.length : 0} | 
                        URLs: {listing.photos?.map(p => p.substring(0, 30) + '...').join(', ')}
                      </div>
                    )}
                    
                    {/* Main Photo Display */}
                    <div className="text-center">
                      <ListingImagePreview 
                        photos={listing.photos} 
                        title={listing.title}
                        className="w-full max-w-md mx-auto h-64 object-cover rounded-lg border"
                      />
                    </div>
                    
                    {/* Photo Grid */}
                    {listing.photos && listing.photos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {listing.photos.slice(0, 8).map((photo, index) => {
                          console.log(`🖼️ Rendering photo ${index + 1}:`, photo.substring(0, 50) + '...');
                          return (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden border bg-gray-50 relative">
                              <img
                                src={photo}
                                alt={`${listing.title} - Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                onLoad={() => console.log(`✅ Photo ${index + 1} loaded successfully`)}
                                onError={(e) => {
                                  console.error(`❌ Photo ${index + 1} failed to load:`, photo);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement!;
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs p-1">
                                      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                      <span>Failed</span>
                                    </div>
                                  `;
                                }}
                              />
                              <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Image className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No photos available</p>
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs mt-2">Debug: photos = {JSON.stringify(listing.photos)}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="text-center">
                      <Button variant="outline" disabled>
                        <Image className="w-4 h-4 mr-2" />
                        Add Photos
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">Photo management coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4">
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
                        onChange={(e) => handleInputChange('purchase_price', parseFloat(e.target.value) || 0)}
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
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          placeholder="Brand name"
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Measurements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    
                    {/* Dynamic measurement fields based on what's available */}
                    {(() => {
                      const availableMeasurements = formData.measurements || {};
                      const measurementFields = [
                        // General measurements
                        { key: 'length', label: 'Length', placeholder: 'Length (inches)' },
                        { key: 'width', label: 'Width', placeholder: 'Width (inches)' },
                        { key: 'height', label: 'Height', placeholder: 'Height (inches)' },
                        { key: 'weight', label: 'Weight', placeholder: 'Weight (lbs/oz)' },
                        // Clothing measurements
                        { key: 'chest', label: 'Chest/Bust', placeholder: 'Chest (inches)' },
                        { key: 'waist', label: 'Waist', placeholder: 'Waist (inches)' },
                        { key: 'inseam', label: 'Inseam', placeholder: 'Inseam (inches)' },
                        { key: 'sleeve', label: 'Sleeve', placeholder: 'Sleeve (inches)' },
                        { key: 'shoulder', label: 'Shoulder', placeholder: 'Shoulder (inches)' }
                      ];
                      
                      // Show fields that have values OR are commonly expected
                      const fieldsToShow = measurementFields.filter(field => {
                        const hasValue = availableMeasurements[field.key] && String(availableMeasurements[field.key]).trim() !== '';
                        const isCommon = ['length', 'width', 'height', 'weight'].includes(field.key);
                        return hasValue || isCommon;
                      });
                      
                      if (fieldsToShow.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500">
                            <p>No measurements detected</p>
                            <p className="text-xs mt-1">Add measurements manually if needed</p>
                          </div>
                        );
                      }
                      
                      // Group fields into rows of 2
                      const rows = [];
                      for (let i = 0; i < fieldsToShow.length; i += 2) {
                        rows.push(fieldsToShow.slice(i, i + 2));
                      }
                      
                      return (
                        <div className="space-y-3">
                          {rows.map((row, rowIndex) => (
                            <div key={rowIndex} className="grid grid-cols-2 gap-3">
                              {row.map((field) => (
                                <div key={field.key}>
                                  <label className="text-sm font-medium mb-1 block">
                                    {field.label}
                                    {availableMeasurements[field.key] && String(availableMeasurements[field.key]).trim() !== '' && (
                                      <span className="ml-1 text-green-600 text-xs">✓</span>
                                    )}
                                  </label>
                                  <Input
                                    value={String(availableMeasurements[field.key] || '')}
                                    onChange={(e) => handleMeasurementChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                  />
                                </div>
                              ))}
                              {/* Fill empty space if odd number of fields in row */}
                              {row.length === 1 && <div></div>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    
                    <p className="text-xs text-gray-500 mt-3">
                      💡 Measurements are automatically detected by AI. Edit as needed.
                    </p>
                  </CardContent>
                </Card>
              </div>

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
            </TabsContent>

            {/* Shipping Tab */}
            <TabsContent value="shipping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Shipping Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Current Shipping Cost</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.shipping_cost}
                        onChange={(e) => handleInputChange('shipping_cost', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">USD</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('shipping_cost', 0)}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      Set Free Shipping
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('shipping_cost', 9.95)}
                    >
                      Set Standard ($9.95)
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Current Setting:</strong> {formData.shipping_cost === 0 ? 'Free Shipping' : `$${formData.shipping_cost.toFixed(2)} shipping cost`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SimpleListingEditModal;
