
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface QuickReviewInterfaceProps {
  groups: PhotoGroup[];
  currentIndex: number;
  onNext: () => void;
  onBack: () => void;
  onApprove: (group: PhotoGroup) => void;
  onReject: () => void;
  onSaveDraft: (group: PhotoGroup) => void;
  onReturn: () => void;
}

const QuickReviewInterface = ({
  groups,
  currentIndex,
  onNext,
  onBack,
  onApprove,
  onReject,
  onSaveDraft,
  onReturn
}: QuickReviewInterfaceProps) => {
  const currentGroup = groups[currentIndex];
  const [editedGroup, setEditedGroup] = useState<PhotoGroup>(currentGroup);

  useEffect(() => {
    setEditedGroup(currentGroup);
  }, [currentGroup]);

  const handleFieldUpdate = (field: string, value: any) => {
    setEditedGroup(prev => ({
      ...prev,
      listingData: {
        ...prev.listingData,
        [field]: value
      }
    }));
  };

  const handleShippingSelect = (shippingOption: any) => {
    setEditedGroup(prev => ({
      ...prev,
      selectedShipping: shippingOption
    }));
  };

  const hasRequiredData = () => {
    return editedGroup.listingData?.title && 
           editedGroup.listingData?.price && 
           editedGroup.selectedShipping;
  };

  if (!currentGroup) return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onReturn} size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {currentIndex + 1} of {groups.length}
              </span>
              <CardTitle className="text-lg">{currentGroup.name}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onBack} 
                disabled={currentIndex === 0}
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={onNext} 
                disabled={currentIndex >= groups.length - 1}
                size="sm"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {currentGroup.photos?.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`${currentGroup.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Quick Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-sm">Title</Label>
                <Input
                  id="title"
                  value={editedGroup.listingData?.title || ''}
                  onChange={(e) => handleFieldUpdate('title', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="price" className="text-sm">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editedGroup.listingData?.price || ''}
                    onChange={(e) => handleFieldUpdate('price', Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="condition" className="text-sm">Condition</Label>
                  <Select 
                    value={editedGroup.listingData?.condition || ''} 
                    onValueChange={(value) => handleFieldUpdate('condition', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Like New">Like New</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Shipping Options */}
            <div className="space-y-3">
              <Label className="text-sm">Shipping Options</Label>
              {currentGroup.shippingOptions?.map((option, index) => (
                <div 
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    editedGroup.selectedShipping?.name === option.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleShippingSelect(option)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{option.name}</p>
                      <p className="text-xs text-gray-500">{option.timeframe}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${option.cost}</p>
                      {option.recommended && (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t gap-3">
            <Button 
              variant="destructive" 
              onClick={() => onReject()}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => onSaveDraft(editedGroup)}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => onApprove(editedGroup)}
                disabled={!hasRequiredData()}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickReviewInterface;
