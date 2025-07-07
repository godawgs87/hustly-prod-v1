
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Calendar, DollarSign, MapPin } from 'lucide-react';

interface EnhancedListingData {
  title: string;
  description: string;
  price: number;
  purchase_price?: number;
  purchase_date?: string;
  source_location?: string;
  source_type?: string;
  category: string;
  condition: string;
  measurements: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  };
  keywords?: string[];
  photos: string[];
  priceResearch?: string;
  brand?: string;
  model?: string;
  features?: string[];
  defects?: string[];
  includes?: string[];
  status?: string;
  performance_notes?: string;
}

interface EnhancedListingEditorProps {
  listing: EnhancedListingData;
  onSave: (updatedListing: EnhancedListingData) => void;
  onCancel: () => void;
  sourcingLocations?: Array<{ id: string; name: string; location_type: string }>;
}

const EnhancedListingEditor = ({ 
  listing, 
  onSave, 
  onCancel, 
  sourcingLocations = [] 
}: EnhancedListingEditorProps) => {
  const [formData, setFormData] = useState<EnhancedListingData>(listing);

  const handleInputChange = (field: keyof EnhancedListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePotentialProfit = () => {
    if (formData.price && formData.purchase_price) {
      return formData.price - formData.purchase_price;
    }
    return 0;
  };

  const calculateProfitMargin = () => {
    const profit = calculatePotentialProfit();
    if (profit && formData.purchase_price) {
      return ((profit / formData.purchase_price) * 100).toFixed(1);
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Edit Inventory Item</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50">
        <h3 className="font-semibold mb-3 flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Purchase Price</span>
            <div className="font-bold">${formData.purchase_price || 0}</div>
          </div>
          <div>
            <span className="text-gray-500">Listed Price</span>
            <div className="font-bold">${formData.price || 0}</div>
          </div>
          <div>
            <span className="text-gray-500">Potential Profit</span>
            <div className={`font-bold ${calculatePotentialProfit() > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${calculatePotentialProfit().toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Profit Margin</span>
            <div className={`font-bold ${calculatePotentialProfit() > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateProfitMargin()}%
            </div>
          </div>
        </div>
      </Card>

      {/* Acquisition Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          Acquisition Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purchase_price">Purchase Price</Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              value={formData.purchase_price || ''}
              onChange={(e) => handleInputChange('purchase_price', parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              value={formData.purchase_date || ''}
              onChange={(e) => handleInputChange('purchase_date', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="source_location">Source Location</Label>
            <Select 
              value={formData.source_location || ''} 
              onValueChange={(value) => handleInputChange('source_location', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select source location" />
              </SelectTrigger>
              <SelectContent>
                {sourcingLocations.map(location => (
                  <SelectItem key={location.id} value={location.name}>
                    {location.name}
                  </SelectItem>
                ))}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="source_type">Source Type</Label>
            <Select 
              value={formData.source_type || ''} 
              onValueChange={(value) => handleInputChange('source_type', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thrift_store">Thrift Store</SelectItem>
                <SelectItem value="estate_sale">Estate Sale</SelectItem>
                <SelectItem value="garage_sale">Garage Sale</SelectItem>
                <SelectItem value="flea_market">Flea Market</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Basic Information - reuse from existing ListingEditor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-1 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Listed Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={formData.condition} 
                onValueChange={(value) => handleInputChange('condition', value)}
              >
                <SelectTrigger className="mt-1">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="mt-1"
                placeholder="e.g., Electronics"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status || 'draft'} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Notes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Notes</h3>
        <Textarea
          value={formData.performance_notes || ''}
          onChange={(e) => handleInputChange('performance_notes', e.target.value)}
          placeholder="Notes about listing performance, buyer interest, pricing adjustments, etc."
          className="min-h-[80px]"
        />
      </Card>
    </div>
  );
};

export default EnhancedListingEditor;
