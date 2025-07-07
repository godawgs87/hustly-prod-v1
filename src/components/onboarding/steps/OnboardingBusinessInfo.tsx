import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';

interface OnboardingBusinessInfoProps {
  data: any;
  onChange: (data: any) => void;
}

const OnboardingBusinessInfo = ({ data, onChange }: OnboardingBusinessInfoProps) => {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Business Information</h2>
        <p className="text-gray-600">
          Tell us about your reselling business. This helps us set up your listings and shipping correctly.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-type">Business Type</Label>
          <Select value={data.business_type || 'individual'} onValueChange={(value) => updateField('business_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="corporation">Corporation</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">
            {data.business_type === 'individual' || data.business_type === 'sole_proprietorship' 
              ? "As an individual/sole proprietor, you'll file taxes under your personal SSN"
              : "Business entities require separate tax identification and legal structure"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">
              Contact Name *
            </Label>
            <Input
              id="contact-name"
              value={data.contact_name || ''}
              onChange={(e) => updateField('contact_name', e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-name">
              {data.business_type === 'individual' || data.business_type === 'sole_proprietorship' 
                ? "Business/DBA Name" 
                : "Business Name *"}
            </Label>
            <Input
              id="business-name"
              value={data.business_name || ''}
              onChange={(e) => updateField('business_name', e.target.value)}
              placeholder={data.business_type === 'individual' || data.business_type === 'sole_proprietorship' 
                ? "Optional - if you operate under a DBA" 
                : "Legal business name"}
            />
            <p className="text-xs text-gray-500">
              {data.business_type === 'individual' || data.business_type === 'sole_proprietorship' 
                ? "Only needed if you have a 'Doing Business As' name"
                : "This must match your legal business registration"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-description">Store Description</Label>
        <Textarea
          id="store-description"
          value={data.store_description || ''}
          onChange={(e) => updateField('store_description', e.target.value)}
          placeholder="Brief description of what you sell"
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
        <p className="text-sm text-gray-600">Where you ship items from</p>

        <div className="space-y-2">
          <Label htmlFor="shipping-address1">Address Line 1 *</Label>
          <Input
            id="shipping-address1"
            value={data.shipping_address_line1 || ''}
            onChange={(e) => updateField('shipping_address_line1', e.target.value)}
            placeholder="Street address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shipping-city">City *</Label>
            <Input
              id="shipping-city"
              value={data.shipping_city || ''}
              onChange={(e) => updateField('shipping_city', e.target.value)}
              placeholder="City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping-state">State</Label>
            <Input
              id="shipping-state"
              value={data.shipping_state || ''}
              onChange={(e) => updateField('shipping_state', e.target.value)}
              placeholder="State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping-postal">ZIP Code</Label>
            <Input
              id="shipping-postal"
              value={data.shipping_postal_code || ''}
              onChange={(e) => updateField('shipping_postal_code', e.target.value)}
              placeholder="12345"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingBusinessInfo;