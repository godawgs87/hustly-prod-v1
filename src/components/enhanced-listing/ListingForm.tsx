import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Loader2, Save, Eye, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ListingData } from '@/types/CreateListing';
import CategorySelector from '../enhanced-category/CategorySelector';
import ValidationSystem from '../validation/ValidationSystem';

interface ListingFormProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
  onSave?: () => Promise<void>;
  onPublish?: () => Promise<void>;
  onPreview?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  mode?: 'create' | 'edit';
  showValidation?: boolean;
}

const ListingForm = ({
  listingData,
  onUpdate,
  onSave,
  onPublish,
  onPreview,
  isSaving = false,
  isPublishing = false,
  mode = 'create',
  showValidation = true
}: ListingFormProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [validationSummary, setValidationSummary] = useState({
    isValid: false,
    score: 0,
    errors: [],
    warnings: [],
    recommendations: [],
    completedRules: 0,
    totalRules: 0
  });
  const { toast } = useToast();

  // Auto-save functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onSave && listingData.title && mode === 'edit') {
        onSave();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [listingData, onSave, mode]);

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleMeasurementChange = (measurement: string, value: string) => {
    onUpdate({
      measurements: {
        ...listingData.measurements,
        [measurement]: value
      }
    });
  };

  const handleCategoryChange = (categoryId: string, categoryPath: string, category?: any) => {
    onUpdate({
      ebay_category_id: categoryId,
      ebay_category_path: categoryPath
    });
  };

  const handlePublish = async () => {
    if (!validationSummary.isValid) {
      toast({
        title: "Validation Required",
        description: `Please fix ${validationSummary.errors.length} validation error(s) before publishing.`,
        variant: "destructive"
      });
      setActiveTab('validation');
      return;
    }

    if (onPublish) {
      await onPublish();
    }
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'basic':
        const hasBasics = listingData.title && listingData.price > 0 && listingData.condition;
        return hasBasics ? 'complete' : 'incomplete';
      case 'details':
        const hasDetails = listingData.description && listingData.ebay_category_id;
        return hasDetails ? 'complete' : 'incomplete';
      case 'measurements':
        const hasMeasurements = listingData.measurements && Object.keys(listingData.measurements).length > 0;
        return hasMeasurements ? 'complete' : 'optional';
      case 'validation':
        return validationSummary.isValid ? 'complete' : 'incomplete';
      default:
        return 'incomplete';
    }
  };

  const getTabIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'incomplete':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'optional':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {mode === 'create' ? 'Create New Listing' : 'Edit Listing'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete all required fields to publish your listing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showValidation && (
                <Badge 
                  variant={validationSummary.isValid ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {validationSummary.score}% Complete
                </Badge>
              )}
              {isSaving && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            {getTabIcon(getTabStatus('basic'))}
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            {getTabIcon(getTabStatus('details'))}
            Details
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center gap-2">
            {getTabIcon(getTabStatus('measurements'))}
            Measurements
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            {getTabIcon(getTabStatus('validation'))}
            Validation
          </TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={listingData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {listingData.title?.length || 0}/80 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={listingData.price || ''}
                      onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition *</Label>
                    <select
                      id="condition"
                      value={listingData.condition || ''}
                      onChange={(e) => handleFieldChange('condition', e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select condition...</option>
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={listingData.gender || ''}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select gender...</option>
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="age_group">Age Group</Label>
                    <select
                      id="age_group"
                      value={listingData.age_group || ''}
                      onChange={(e) => handleFieldChange('age_group', e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select age group...</option>
                      <option value="Adult">Adult</option>
                      <option value="Youth">Youth</option>
                      <option value="Toddler">Toddler</option>
                      <option value="Baby">Baby</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clothing_size">Clothing Size</Label>
                    <Input
                      id="clothing_size"
                      value={listingData.clothing_size || ''}
                      onChange={(e) => handleFieldChange('clothing_size', e.target.value)}
                      placeholder="e.g., Medium, 32W x 34L"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoe_size">Shoe Size</Label>
                    <Input
                      id="shoe_size"
                      value={listingData.shoe_size || ''}
                      onChange={(e) => handleFieldChange('shoe_size', e.target.value)}
                      placeholder="e.g., 10.5, 8W"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={listingData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe the item's condition, features, and any flaws..."
                  className="mt-1 min-h-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {listingData.description?.length || 0} characters
                </p>
              </div>

              <div>
                <Label>eBay Category *</Label>
                <div className="mt-1">
                  <CategorySelector
                    value={listingData.ebay_category_id}
                    categoryPath={listingData.ebay_category_path}
                    onChange={handleCategoryChange}
                    itemTitle={listingData.title}
                    itemDescription={listingData.description}
                    showSuggestions={true}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Features & Keywords</h4>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="keywords"
                    value={listingData.keywords?.join(', ') || ''}
                    onChange={(e) => handleFieldChange('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                    placeholder="vintage, retro, summer, cotton..."
                    className="mt-1 h-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Measurements */}
        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <CardTitle>Measurements & Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="length">Length (inches)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={listingData.measurements?.length || ''}
                    onChange={(e) => handleMeasurementChange('length', e.target.value)}
                    placeholder="0.0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (inches)</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={listingData.measurements?.width || ''}
                    onChange={(e) => handleMeasurementChange('width', e.target.value)}
                    placeholder="0.0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (inches)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={listingData.measurements?.height || ''}
                    onChange={(e) => handleMeasurementChange('height', e.target.value)}
                    placeholder="0.0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (oz)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={listingData.measurements?.weight || ''}
                    onChange={(e) => handleMeasurementChange('weight', e.target.value)}
                    placeholder="0.0"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation">
          {showValidation && (
            <ValidationSystem
              data={listingData}
              onChange={handleFieldChange}
              onValidationChange={setValidationSummary}
              mode="full"
              autoValidate={true}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onPreview && (
                <Button variant="outline" onClick={onPreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onSave && (
                <Button 
                  variant="outline" 
                  onClick={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Draft
                </Button>
              )}
              {onPublish && (
                <Button 
                  onClick={handlePublish}
                  disabled={isPublishing || !validationSummary.isValid}
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publish Listing
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ListingForm;