
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Clock, DollarSign, AlertTriangle } from 'lucide-react';

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  days: string;
  packaging: string;
  recommended?: boolean;
}

interface ShippingOptionsCalculatorProps {
  shippingOptions: ShippingOption[];
  selectedOption?: ShippingOption | null;
  onSelectShipping: (option: ShippingOption) => void;
  itemPrice: number;
}

const ShippingOptionsCalculator = ({
  shippingOptions,
  selectedOption,
  onSelectShipping,
  itemPrice
}: ShippingOptionsCalculatorProps) => {
  const getShippingWarning = (option: ShippingOption) => {
    const percentage = (option.cost / itemPrice) * 100;
    if (percentage > 40) {
      return {
        type: 'high',
        message: `Shipping is ${percentage.toFixed(0)}% of item price`
      };
    }
    if (percentage > 25) {
      return {
        type: 'medium',
        message: `Shipping is ${percentage.toFixed(0)}% of item price`
      };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedOption?.id || ''}
        onValueChange={(value) => {
          const option = shippingOptions.find(opt => opt.id === value);
          if (option) onSelectShipping(option);
        }}
        className="space-y-3"
      >
        {shippingOptions.map((option) => {
          const warning = getShippingWarning(option);
          
          return (
            <Card 
              key={option.id} 
              className={`border-2 transition-colors cursor-pointer ${
                selectedOption?.id === option.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : option.recommended 
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelectShipping(option)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label 
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Truck className="w-4 h-4" />
                          <span className="font-medium text-lg">{option.name}</span>
                          {option.recommended && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {option.days}
                          </span>
                          <span className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {option.packaging}
                          </span>
                        </div>

                        {warning && (
                          <div className={`flex items-center mt-2 text-xs ${
                            warning.type === 'high' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {warning.message}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center text-xl font-bold">
                          <DollarSign className="w-5 h-5" />
                          {option.cost.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {itemPrice > 0 && `${((option.cost / itemPrice) * 100).toFixed(0)}% of price`}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>

      {selectedOption && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center text-green-800">
              <span className="text-lg">✓</span>
              <span className="ml-2 font-medium">
                Selected: {selectedOption.name} - ${selectedOption.cost.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShippingOptionsCalculator;
