
import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Calendar, MapPin, Users } from 'lucide-react';

interface PurchaseConsignmentData {
  purchase_price?: number;
  purchase_date?: string;
  source_location?: string;
  source_type?: string;
  is_consignment?: boolean;
  consignment_percentage?: number;
  consignor_name?: string;
  consignor_contact?: string;
}

interface PurchaseConsignmentSectionProps {
  data: PurchaseConsignmentData;
  onChange: (field: keyof PurchaseConsignmentData, value: any) => void;
  listingPrice?: number;
}

const PurchaseConsignmentSection = ({ data, onChange, listingPrice = 0 }: PurchaseConsignmentSectionProps) => {
  const calculatePotentialProfit = () => {
    if (listingPrice && data.purchase_price) {
      const profit = listingPrice - data.purchase_price;
      const margin = data.purchase_price ? ((profit / data.purchase_price) * 100).toFixed(1) : '0';
      return { profit, margin };
    }
    return { profit: 0, margin: '0' };
  };

  const { profit, margin } = calculatePotentialProfit();

  return (
    <div className="space-y-6">
      {/* Purchase Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Purchase Information
        </h3>
        
        {/* Profit Preview */}
        {data.purchase_price && listingPrice > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Purchase Price:</span>
                <div className="font-semibold">${data.purchase_price}</div>
              </div>
              <div>
                <span className="text-gray-600">Listed Price:</span>
                <div className="font-semibold">${listingPrice}</div>
              </div>
              <div>
                <span className="text-gray-600">Potential Profit:</span>
                <div className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${profit.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Profit Margin:</span>
                <div className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {margin}%
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purchase_price">Purchase Price ($)</Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={data.purchase_price || ''}
              onChange={(e) => onChange('purchase_price', parseFloat(e.target.value) || undefined)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              value={data.purchase_date || ''}
              onChange={(e) => onChange('purchase_date', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="source_location">Source Location</Label>
            <Input
              id="source_location"
              placeholder="e.g., Goodwill on Main St"
              value={data.source_location || ''}
              onChange={(e) => onChange('source_location', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="source_type">Source Type</Label>
            <Select 
              value={data.source_type || ''} 
              onValueChange={(value) => onChange('source_type', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thrift_store">Thrift Store</SelectItem>
                <SelectItem value="estate_sale">Estate Sale</SelectItem>
                <SelectItem value="garage_sale">Garage Sale</SelectItem>
                <SelectItem value="consignment">Consignment</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="online">Online Purchase</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Consignment Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Consignment Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_consignment"
              checked={data.is_consignment || false}
              onCheckedChange={(checked) => onChange('is_consignment', checked)}
            />
            <Label htmlFor="is_consignment" className="text-sm font-medium">
              This item is being sold on consignment
            </Label>
          </div>
          
          {data.is_consignment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="consignment_percentage">Your Percentage (%)</Label>
                <Input
                  id="consignment_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="70.00"
                  value={data.consignment_percentage || ''}
                  onChange={(e) => onChange('consignment_percentage', parseFloat(e.target.value) || undefined)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage you keep from the sale
                </p>
              </div>
              
              <div>
                <Label htmlFor="consignor_name">Consignor Name</Label>
                <Input
                  id="consignor_name"
                  placeholder="John Doe"
                  value={data.consignor_name || ''}
                  onChange={(e) => onChange('consignor_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="consignor_contact">Consignor Contact</Label>
                <Textarea
                  id="consignor_contact"
                  placeholder="Phone: (555) 123-4567, Email: john@email.com"
                  value={data.consignor_contact || ''}
                  onChange={(e) => onChange('consignor_contact', e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PurchaseConsignmentSection;
