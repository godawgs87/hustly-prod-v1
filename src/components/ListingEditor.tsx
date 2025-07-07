
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Save, X, Plus, Edit } from 'lucide-react';
import { ListingData } from '@/types/CreateListing';

interface ListingEditorProps {
  listing: ListingData;
  onSave: (updatedListing: ListingData) => void;
  onCancel: () => void;
}

const ListingEditor = ({ listing, onSave, onCancel }: ListingEditorProps) => {
  const [formData, setFormData] = useState<ListingData>(listing);
  const [newKeyword, setNewKeyword] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newDefect, setNewDefect] = useState('');
  const [newInclude, setNewInclude] = useState('');

  const handleInputChange = (field: keyof ListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const addArrayItem = (field: string, value: string, setter: (val: string) => void) => {
    if (value.trim()) {
      const currentArray = (formData as any)[field] || [];
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, value.trim()]
      }));
      setter('');
    }
  };

  const removeArrayItem = (field: string, index: number) => {
    const currentArray = (formData as any)[field] || [];
    setFormData(prev => ({
      ...prev,
      [field]: currentArray.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Edit Listing</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
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
                <Label htmlFor="price">Price ($)</Label>
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
                  placeholder="e.g., Tools & Hardware"
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={(formData as any).brand || ''}
                  onChange={(e) => handleInputChange('brand' as any, e.target.value)}
                  className="mt-1"
                  placeholder="e.g., DeWalt"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={(formData as any).model || ''}
                onChange={(e) => handleInputChange('model' as any, e.target.value)}
                className="mt-1"
                placeholder="e.g., DCD771C2"
              />
            </div>
          </div>
        </Card>

        {/* Measurements */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Measurements</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="length">Length</Label>
              <Input
                id="length"
                value={formData.measurements.length || ''}
                onChange={(e) => handleMeasurementChange('length', e.target.value)}
                className="mt-1"
                placeholder="e.g., 10 inches"
              />
            </div>
            <div>
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                value={formData.measurements.width || ''}
                onChange={(e) => handleMeasurementChange('width', e.target.value)}
                className="mt-1"
                placeholder="e.g., 8 inches"
              />
            </div>
            <div>
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={formData.measurements.height || ''}
                onChange={(e) => handleMeasurementChange('height', e.target.value)}
                className="mt-1"
                placeholder="e.g., 6 inches"
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={formData.measurements.weight || ''}
                onChange={(e) => handleMeasurementChange('weight', e.target.value)}
                className="mt-1"
                placeholder="e.g., 2 lbs"
              />
            </div>
          </div>
        </Card>

        {/* Keywords */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Keywords</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(formData.keywords || []).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeArrayItem('keywords', index)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add keyword..."
                onKeyPress={(e) => e.key === 'Enter' && addArrayItem('keywords', newKeyword, setNewKeyword)}
              />
              <Button 
                type="button" 
                onClick={() => addArrayItem('keywords', newKeyword, setNewKeyword)}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Features</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              {((formData as any).features || []).map((feature: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">{feature}</span>
                  <X 
                    className="w-4 h-4 cursor-pointer hover:text-red-500" 
                    onClick={() => removeArrayItem('features', index)}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add feature..."
                onKeyPress={(e) => e.key === 'Enter' && addArrayItem('features', newFeature, setNewFeature)}
              />
              <Button 
                type="button" 
                onClick={() => addArrayItem('features', newFeature, setNewFeature)}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Defects/Issues */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Defects/Issues</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              {((formData as any).defects || []).map((defect: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm">{defect}</span>
                  <X 
                    className="w-4 h-4 cursor-pointer hover:text-red-500" 
                    onClick={() => removeArrayItem('defects', index)}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newDefect}
                onChange={(e) => setNewDefect(e.target.value)}
                placeholder="Add defect or issue..."
                onKeyPress={(e) => e.key === 'Enter' && addArrayItem('defects', newDefect, setNewDefect)}
              />
              <Button 
                type="button" 
                onClick={() => addArrayItem('defects', newDefect, setNewDefect)}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* What's Included */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">What's Included</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              {((formData as any).includes || []).map((item: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">{item}</span>
                  <X 
                    className="w-4 h-4 cursor-pointer hover:text-red-500" 
                    onClick={() => removeArrayItem('includes', index)}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInclude}
                onChange={(e) => setNewInclude(e.target.value)}
                placeholder="Add included item..."
                onKeyPress={(e) => e.key === 'Enter' && addArrayItem('includes', newInclude, setNewInclude)}
              />
              <Button 
                type="button" 
                onClick={() => addArrayItem('includes', newInclude, setNewInclude)}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Price Research */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Price Research Notes</h3>
          <Textarea
            value={formData.priceResearch || ''}
            onChange={(e) => handleInputChange('priceResearch', e.target.value)}
            placeholder="Notes about pricing research and market analysis..."
            className="min-h-[80px]"
          />
        </Card>
      </div>
    </div>
  );
};

export default ListingEditor;
