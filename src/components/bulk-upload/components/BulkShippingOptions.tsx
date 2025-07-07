
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, MapPin, Package } from 'lucide-react';
import { calculateShippingCost } from '../utils/shippingCalculator';

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  days: string;
  description: string;
}

interface BulkShippingOptionsProps {
  itemWeight: number;
  itemDimensions: { length: number; width: number; height: number };
  onShippingSelect: (option: ShippingOption) => void;
  selectedOption?: ShippingOption;
}

const BulkShippingOptions: React.FC<BulkShippingOptionsProps> = ({
  itemWeight,
  itemDimensions,
  onShippingSelect,
  selectedOption
}) => {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateOptions = async () => {
      setIsLoading(true);
      try {
        // CRITICAL: Local pickup option must be first (matching single upload)
        const localPickup: ShippingOption = {
          id: 'local-pickup',
          name: 'Local Pickup',
          cost: 0,
          days: 'Same day',
          description: 'Buyer picks up item in person - no shipping required'
        };

        // Calculate shipping costs based on weight and dimensions
        const groundCost = calculateShippingCost(itemWeight, itemDimensions, 'ground');
        const expeditedCost = calculateShippingCost(itemWeight, itemDimensions, 'expedited');
        const priorityCost = calculateShippingCost(itemWeight, itemDimensions, 'priority');

        const calculatedOptions: ShippingOption[] = [
          localPickup, // MUST be first option
          {
            id: 'usps-ground',
            name: 'USPS Ground Advantage',
            cost: groundCost,
            days: '3-5 business days',
            description: 'Reliable ground shipping with tracking'
          },
          {
            id: 'usps-priority',
            name: 'USPS Priority Mail',
            cost: priorityCost,
            days: '1-3 business days',
            description: 'Faster delivery with priority handling'
          },
          {
            id: 'usps-express',
            name: 'USPS Priority Mail Express',
            cost: expeditedCost,
            days: '1-2 business days',
            description: 'Fastest delivery option available'
          }
        ];

        console.log('Generated shipping options for bulk upload:', calculatedOptions);
        setShippingOptions(calculatedOptions);
      } catch (error) {
        console.error('Error calculating shipping options:', error);
        // Fallback options that still include local pickup
        setShippingOptions([
          {
            id: 'local-pickup',
            name: 'Local Pickup',
            cost: 0,
            days: 'Same day',
            description: 'Buyer picks up item in person'
          },
          {
            id: 'standard',
            name: 'Standard Shipping',
            cost: 9.95,
            days: '3-7 business days',
            description: 'Standard ground shipping'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    calculateOptions();
  }, [itemWeight, itemDimensions]);

  const handleOptionSelect = (option: ShippingOption) => {
    console.log('Selected shipping option in bulk upload:', option);
    onShippingSelect(option);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Calculate Shipping Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Calculating shipping costs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Shipping Options
        </CardTitle>
        <p className="text-sm text-gray-600">
          Weight: {itemWeight} lbs | Dimensions: {itemDimensions.length}" × {itemDimensions.width}" × {itemDimensions.height}"
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {shippingOptions.map((option) => (
          <div
            key={option.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedOption?.id === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOptionSelect(option)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {option.id === 'local-pickup' ? (
                  <MapPin className="w-5 h-5 text-green-600" />
                ) : (
                  <Truck className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <div className="font-medium">{option.name}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {option.cost === 0 ? 'FREE' : `$${option.cost.toFixed(2)}`}
                </div>
                <div className="text-sm text-gray-600">{option.days}</div>
              </div>
            </div>
            {selectedOption?.id === option.id && (
              <div className="mt-2">
                <Badge variant="default" className="bg-blue-600">
                  Selected
                </Badge>
              </div>
            )}
          </div>
        ))}
        
        {selectedOption && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-800">
              <Package className="w-4 h-4 mr-2" />
              <span className="font-medium">
                {selectedOption.name} selected
                {selectedOption.cost === 0 ? ' (FREE)' : ` ($${selectedOption.cost.toFixed(2)})`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkShippingOptions;
