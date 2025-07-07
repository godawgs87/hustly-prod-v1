
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface ShippingCalculatorProps {
  itemWeight?: number;
  itemDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  onShippingSelect: (option: any) => void;
}

const ShippingCalculator = ({ 
  itemWeight = 1, 
  itemDimensions = { length: 12, width: 12, height: 6 },
  onShippingSelect 
}: ShippingCalculatorProps) => {
  const [weight, setWeight] = useState(itemWeight);
  const [dimensions, setDimensions] = useState(itemDimensions);
  const [isLocalPickup, setIsLocalPickup] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const calculateShipping = () => {
    if (isLocalPickup) {
      return [
        { service: 'Local Pickup', cost: 0, days: '0-1', description: 'Free local pickup' }
      ];
    }

    const baseRate = 9.95;
    const weightMultiplier = Math.max(1, Math.ceil(weight));
    const volumeWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
    const billableWeight = Math.max(weight, volumeWeight);
    
    return [
      { 
        service: 'USPS Ground Advantage', 
        cost: baseRate + (billableWeight * 0.5), 
        days: '2-5',
        description: 'Most economical option'
      },
      { 
        service: 'USPS Priority Mail', 
        cost: baseRate + (billableWeight * 1.2), 
        days: '1-3',
        description: 'Faster delivery with tracking'
      },
      { 
        service: 'UPS Ground', 
        cost: baseRate + (billableWeight * 0.8), 
        days: '1-5',
        description: 'Reliable ground shipping'
      }
    ];
  };

  const shippingOptions = calculateShipping();

  const handleSelectOption = (option: any) => {
    setSelectedOption(option.service);
    onShippingSelect({
      service: option.service,
      cost: option.cost,
      estimatedDays: option.days
    });
  };

  return (
    <div className="space-y-6">
      {/* Pickup Option */}
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Checkbox 
          id="local-pickup"
          checked={isLocalPickup}
          onCheckedChange={(checked) => setIsLocalPickup(checked as boolean)}
        />
        <div>
          <Label htmlFor="local-pickup" className="text-sm font-medium">
            Local Pickup Only (Free)
          </Label>
          <p className="text-xs text-gray-600">Buyer picks up item locally</p>
        </div>
      </div>

      {!isLocalPickup && (
        <>
          <Separator />
          
          {/* Item Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Item Specifications</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight" className="text-sm">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="length" className="text-sm">Length (in)</Label>
                <Input
                  id="length"
                  type="number"
                  value={dimensions.length}
                  onChange={(e) => setDimensions(prev => ({
                    ...prev,
                    length: parseInt(e.target.value) || 0
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="width" className="text-sm">Width (in)</Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions(prev => ({
                    ...prev,
                    width: parseInt(e.target.value) || 0
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-sm">Height (in)</Label>
                <Input
                  id="height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => setDimensions(prev => ({
                    ...prev,
                    height: parseInt(e.target.value) || 0
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Shipping Options */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">
          {isLocalPickup ? 'Pickup Option' : 'Shipping Options'}
        </h4>
        
        <div className="space-y-3">
          {shippingOptions.map((option, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedOption === option.service 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectOption(option)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{option.service}</span>
                  <span className="font-bold text-lg">${option.cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">{option.description}</span>
                  <span className="text-sm text-gray-500">
                    {option.days} {option.service !== 'Local Pickup' ? 'business days' : 'days'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOption && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✓ Selected: <strong>{selectedOption}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
