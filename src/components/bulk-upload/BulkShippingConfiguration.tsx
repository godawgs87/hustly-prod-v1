
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Truck, Package, MapPin, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateShippingOptions } from './utils/shippingCalculator';
import type { PhotoGroup } from './BulkUploadManager';

interface BulkShippingConfigurationProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithShipping: PhotoGroup[]) => void;
  onBack: () => void;
  onUpdateGroup: (group: PhotoGroup) => void;
}

const BulkShippingConfiguration = ({ 
  photoGroups, 
  onComplete, 
  onBack, 
  onUpdateGroup 
}: BulkShippingConfigurationProps) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<PhotoGroup[]>([]);

  // Initialize groups with smart shipping defaults
  useEffect(() => {
    const initializeShipping = () => {
      const updatedGroups = photoGroups.map(group => {
        if (group.status !== 'completed') return group;

        // Estimate weight based on item category/type
        const estimatedWeight = estimateItemWeight(group);
        const shippingOptions = generateShippingOptions(estimatedWeight);
        
        // Smart default selection based on item characteristics
        const defaultShipping = selectDefaultShipping(group, shippingOptions);
        
        return {
          ...group,
          shippingOptions,
          selectedShipping: group.selectedShipping || defaultShipping
        };
      });
      
      setGroups(updatedGroups);
    };

    initializeShipping();
  }, [photoGroups]);

  const estimateItemWeight = (group: PhotoGroup): number => {
    const category = group.listingData?.category?.toLowerCase() || '';
    const title = group.listingData?.title?.toLowerCase() || '';
    
    // Weight estimation based on item type
    if (category.includes('clothing') || title.includes('shirt') || title.includes('dress')) {
      return 0.5; // 0.5 lbs for clothing
    }
    if (category.includes('shoes') || title.includes('shoe')) {
      return 2; // 2 lbs for shoes
    }
    if (category.includes('electronics')) {
      return 3; // 3 lbs for electronics
    }
    if (category.includes('books')) {
      return 1; // 1 lb for books
    }
    
    return 1; // Default 1 lb
  };

  const selectDefaultShipping = (group: PhotoGroup, options: any[]) => {
    const price = group.listingData?.price || 0;
    
    // For high-value items (>$100), suggest Priority Mail
    if (price > 100) {
      return options.find(opt => opt.id === 'usps-priority') || options[1];
    }
    
    // For low-value items, suggest Ground
    return options.find(opt => opt.id === 'usps-ground') || options[1];
  };

  const handleShippingSelect = (groupId: string, shippingId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const selectedShipping = group.shippingOptions?.find(opt => opt.id === shippingId);
        const updatedGroup = { ...group, selectedShipping };
        onUpdateGroup(updatedGroup);
        return updatedGroup;
      }
      return group;
    }));
  };

  const handleBulkApply = (shippingId: string, filterFn: (group: PhotoGroup) => boolean) => {
    setGroups(prev => prev.map(group => {
      if (filterFn(group)) {
        const selectedShipping = group.shippingOptions?.find(opt => opt.id === shippingId);
        if (selectedShipping) {
          const updatedGroup = { ...group, selectedShipping };
          onUpdateGroup(updatedGroup);
          return updatedGroup;
        }
      }
      return group;
    }));
  };

  const handleComplete = () => {
    const readyGroups = groups.filter(g => g.selectedShipping);
    
    if (readyGroups.length === 0) {
      toast({
        title: "No shipping configured",
        description: "Please configure shipping for at least one item.",
        variant: "destructive"
      });
      return;
    }

    onComplete(groups);
    
    toast({
      title: "Shipping configured!",
      description: `${readyGroups.length} items ready for posting.`,
    });
  };

  const completedGroups = groups.filter(g => g.status === 'completed');
  const configuredCount = completedGroups.filter(g => g.selectedShipping).length;
  const totalShippingCost = completedGroups.reduce((sum, group) => 
    sum + (group.selectedShipping?.cost || 0), 0
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Configure Shipping Options
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700 w-fit">
                {configuredCount} of {completedGroups.length} Configured
              </Badge>
              <span className="text-gray-600">
                Total Shipping: <span className="font-semibold">${totalShippingCost.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Bulk Actions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Apply to Multiple Items
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply('local-pickup', (g) => true)}
                className="bg-white text-xs sm:text-sm"
              >
                <MapPin className="w-3 h-3 mr-1" />
                All Items → Local Pickup (Free)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply('usps-ground', (g) => (g.listingData?.price || 0) < 50)}
                className="bg-white text-xs sm:text-sm"
              >
                <Package className="w-3 h-3 mr-1" />
                Low Value → Ground ($6-10)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApply('usps-priority', (g) => (g.listingData?.price || 0) >= 50)}
                className="bg-white text-xs sm:text-sm"
              >
                <Truck className="w-3 h-3 mr-1" />
                High Value → Priority ($10-15)
              </Button>
            </div>
          </div>

          <Separator />

          {/* Individual Item Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Individual Item Shipping</h3>
            
            {completedGroups.map((group) => (
              <Card key={group.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Item Preview */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {group.photos?.[0] ? (
                        <img
                          src={URL.createObjectURL(group.photos[0])}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>

                    <div className="flex-1 w-full min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{group.listingData?.title || group.name}</h4>
                          <p className="text-sm text-gray-600">
                            ${group.listingData?.price} • {group.listingData?.condition}
                          </p>
                        </div>
                        {group.selectedShipping && (
                          <Badge className="bg-green-100 text-green-800 w-fit">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        )}
                      </div>

                      {group.shippingOptions && (
                        <RadioGroup
                          value={group.selectedShipping?.id || ''}
                          onValueChange={(value) => handleShippingSelect(group.id, value)}
                          className="space-y-2"
                        >
                          {group.shippingOptions.map((option) => (
                            <div key={option.id} className="flex items-center space-x-3 p-2 rounded border hover:bg-gray-50">
                              <RadioGroupItem value={option.id} id={`${group.id}-${option.id}`} />
                              <Label 
                                htmlFor={`${group.id}-${option.id}`}
                                className="flex-1 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  {option.id === 'local-pickup' ? (
                                    <MapPin className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Package className="w-4 h-4 text-blue-600" />
                                  )}
                                  <span className="text-sm sm:text-base">{option.name}</span>
                                  <span className="text-xs sm:text-sm text-gray-500">({option.estimatedDays})</span>
                                </div>
                                <span className="font-medium text-sm sm:text-base">
                                  {option.cost === 0 ? 'FREE' : `$${option.cost.toFixed(2)}`}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t">
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
              Back to Review
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={configuredCount === 0}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              Complete Setup ({configuredCount} items ready)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkShippingConfiguration;
