
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck, Package, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkShippingReviewProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithShipping: PhotoGroup[]) => void;
  onBack: () => void;
}

const BulkShippingReview = ({ photoGroups, onComplete, onBack }: BulkShippingReviewProps) => {
  const [groups, setGroups] = useState<PhotoGroup[]>(
    photoGroups.map(group => ({
      ...group,
      selectedShipping: group.shippingOptions?.[0] // Select recommended option by default
    }))
  );

  const handleShippingSelect = (groupId: string, shippingOption: any) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, selectedShipping: shippingOption }
        : group
    ));
  };

  const handleBulkApply = (shippingOption: any, itemType: string) => {
    setGroups(prev => prev.map(group => {
      // Apply to similar items (simplified logic)
      const shouldApply = group.listingData?.category === itemType || 
                         group.name.toLowerCase().includes(itemType.toLowerCase());
      return shouldApply 
        ? { ...group, selectedShipping: shippingOption }
        : group;
    }));
  };

  const allShippingSelected = groups.every(group => group.selectedShipping);
  const totalShippingCost = groups.reduce((sum, group) => 
    sum + (group.selectedShipping?.cost || 0), 0
  );

  const renderShippingCard = (group: PhotoGroup) => {
    const isCompleted = !!group.selectedShipping;
    const weight = group.listingData?.measurements?.weight || 'Unknown';
    const price = group.listingData?.price || 0;

    return (
      <Card key={group.id} className={`border-l-4 ${
        isCompleted ? 'border-l-green-500' : 'border-l-yellow-500'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{group.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${price}
                </span>
                <span className="flex items-center">
                  <Package className="w-3 h-3 mr-1" />
                  {weight}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {isCompleted ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Select Shipping
                </Badge>
              )}
            </div>
          </div>

          {group.shippingOptions && (
            <RadioGroup
              value={group.selectedShipping?.id || ''}
              onValueChange={(value) => {
                const option = group.shippingOptions?.find(opt => opt.id === value);
                if (option) handleShippingSelect(group.id, option);
              }}
              className="space-y-3"
            >
              {group.shippingOptions.map((option) => (
                <div key={option.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  option.recommended ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}>
                  <RadioGroupItem value={option.id} id={`${group.id}-${option.id}`} />
                  <Label 
                    htmlFor={`${group.id}-${option.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{option.name}</span>
                          {option.recommended && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {option.days} • {option.packaging}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${option.cost}</div>
                        <div className="text-xs text-gray-500">
                          {((option.cost / price) * 100).toFixed(0)}% of price
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Review Shipping Options
            </span>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {groups.filter(g => g.selectedShipping).length} of {groups.length} Ready
              </Badge>
              <span className="text-gray-600">
                Total Shipping: <span className="font-semibold">${totalShippingCost.toFixed(2)}</span>
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-medium mb-3">Quick Apply to Similar Items</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply({ id: 'first-class', cost: 4.50 }, 'shirt')}
              >
                All Shirts → First Class
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply({ id: 'priority', cost: 8.95 }, 'jeans')}
              >
                All Jeans → Priority
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply({ id: 'priority', cost: 12.50 }, 'shoes')}
              >
                All Shoes → Priority Box
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {groups.map(renderShippingCard)}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={onBack}>
              Back to Processing
            </Button>
            <Button 
              onClick={() => onComplete(groups)}
              disabled={!allShippingSelected}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Listings ({groups.length} items)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkShippingReview;
