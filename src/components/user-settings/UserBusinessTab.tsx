import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SKUSettingsSection from './business/SKUSettingsSection';
import InventoryLocationManager from '@/components/inventory/InventoryLocationManager';

interface BusinessProfile {
  contact_name: string;
  business_name: string;
  business_type: string;
  business_phone: string;
  tax_id: string;
  store_name: string;
  store_description: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  use_different_return_address: boolean;
  return_address_line1: string;
  return_address_line2: string;
  return_city: string;
  return_state: string;
  return_postal_code: string;
  return_country: string;
  handling_time_days: number;
  accepts_returns: boolean;
  return_period_days: number;
  return_method: string;
  international_shipping_enabled: boolean;
  default_markup_percentage: number;
  preferred_shipping_service: string;
  shipping_cost_domestic: number;
  shipping_cost_additional: number;
}

const UserBusinessTab = () => {
  const [profile, setProfile] = useState<BusinessProfile>({
    contact_name: '',
    business_name: '',
    business_type: 'individual',
    business_phone: '',
    tax_id: '',
    store_name: '',
    store_description: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'US',
    use_different_return_address: false,
    return_address_line1: '',
    return_address_line2: '',
    return_city: '',
    return_state: '',
    return_postal_code: '',
    return_country: 'US',
    handling_time_days: 1,
    accepts_returns: true,
    return_period_days: 30,
    return_method: 'REPLACEMENT',
    international_shipping_enabled: false,
    default_markup_percentage: 100,
    preferred_shipping_service: 'usps_priority',
    shipping_cost_domestic: 9.95,
    shipping_cost_additional: 2.00
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          contact_name: data.contact_name || data.full_name || '',
          business_name: data.business_name || '',
          business_type: data.business_type || 'individual',
          business_phone: data.business_phone || '',
          tax_id: data.tax_id || '',
          store_name: data.store_name || '',
          store_description: data.store_description || '',
          shipping_address_line1: data.shipping_address_line1 || '',
          shipping_address_line2: data.shipping_address_line2 || '',
          shipping_city: data.shipping_city || '',
          shipping_state: data.shipping_state || '',
          shipping_postal_code: data.shipping_postal_code || '',
          shipping_country: data.shipping_country || 'US',
          use_different_return_address: data.use_different_return_address || false,
          return_address_line1: data.return_address_line1 || '',
          return_address_line2: data.return_address_line2 || '',
          return_city: data.return_city || '',
          return_state: data.return_state || '',
          return_postal_code: data.return_postal_code || '',
          return_country: data.return_country || 'US',
          handling_time_days: data.handling_time_days || 1,
          accepts_returns: data.accepts_returns ?? true,
          return_period_days: data.return_period_days || 30,
          return_method: data.return_method || 'REPLACEMENT',
          international_shipping_enabled: data.international_shipping_enabled || false,
          default_markup_percentage: data.default_markup_percentage || 100,
          preferred_shipping_service: data.preferred_shipping_service || 'usps_priority',
          shipping_cost_domestic: data.shipping_cost_domestic || 9.95,
          shipping_cost_additional: data.shipping_cost_additional || 2.00
        });
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Business Settings Saved",
        description: "Your business information has been updated successfully."
      });
    } catch (error) {
      console.error('Error saving business profile:', error);
      toast({
        title: "Save Failed",
        description: "Could not save business settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (field: keyof BusinessProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Business Settings</h2>
        <p className="text-muted-foreground">
          Configure your business information and seller preferences.
        </p>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Basic information about your business or selling operation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-type">Business Type</Label>
            <Select value={profile.business_type} onValueChange={(value) => updateProfile('business_type', value)}>
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
            <p className="text-sm text-muted-foreground">
              {profile.business_type === 'individual' || profile.business_type === 'sole_proprietorship' 
                ? "Individual/sole proprietors file taxes under personal SSN"
                : "Business entities require separate tax identification"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact Name *</Label>
              <Input
                id="contact-name"
                value={profile.contact_name}
                onChange={(e) => updateProfile('contact_name', e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-name">
                {profile.business_type === 'individual' || profile.business_type === 'sole_proprietorship' 
                  ? "Business/DBA Name" 
                  : "Business Name *"}
              </Label>
              <Input
                id="business-name"
                value={profile.business_name}
                onChange={(e) => updateProfile('business_name', e.target.value)}
                placeholder={profile.business_type === 'individual' || profile.business_type === 'sole_proprietorship' 
                  ? "Optional - if you operate under a DBA" 
                  : "Legal business name"}
              />
              <p className="text-xs text-muted-foreground">
                {profile.business_type === 'individual' || profile.business_type === 'sole_proprietorship' 
                  ? "Only needed if you have a 'Doing Business As' name"
                  : "This must match your legal business registration"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-phone">Business Phone</Label>
              <Input
                id="business-phone"
                value={profile.business_phone}
                onChange={(e) => updateProfile('business_phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID (EIN/SSN)</Label>
              <Input
                id="tax-id"
                value={profile.tax_id}
                onChange={(e) => updateProfile('tax_id', e.target.value)}
                placeholder="12-3456789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-name">Store Name</Label>
            <Input
              id="store-name"
              value={profile.store_name}
              onChange={(e) => updateProfile('store_name', e.target.value)}
              placeholder="Your eBay store name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-description">Store Description</Label>
            <Textarea
              id="store-description"
              value={profile.store_description}
              onChange={(e) => updateProfile('store_description', e.target.value)}
              placeholder="Brief description of your store and products"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
          <CardDescription>
            Address where you ship items from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipping-address1">Address Line 1</Label>
            <Input
              id="shipping-address1"
              value={profile.shipping_address_line1}
              onChange={(e) => updateProfile('shipping_address_line1', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping-address2">Address Line 2 (Optional)</Label>
            <Input
              id="shipping-address2"
              value={profile.shipping_address_line2}
              onChange={(e) => updateProfile('shipping_address_line2', e.target.value)}
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping-city">City</Label>
              <Input
                id="shipping-city"
                value={profile.shipping_city}
                onChange={(e) => updateProfile('shipping_city', e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping-state">State</Label>
              <Input
                id="shipping-state"
                value={profile.shipping_state}
                onChange={(e) => updateProfile('shipping_state', e.target.value)}
                placeholder="State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping-postal">ZIP Code</Label>
              <Input
                id="shipping-postal"
                value={profile.shipping_postal_code}
                onChange={(e) => updateProfile('shipping_postal_code', e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Return Policy</CardTitle>
          <CardDescription>
            Configure your return and refund policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Accept Returns</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to return items
              </p>
            </div>
            <Switch
              checked={profile.accepts_returns}
              onCheckedChange={(checked) => updateProfile('accepts_returns', checked)}
            />
          </div>

          {profile.accepts_returns && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="return-period">Return Period (Days)</Label>
                  <Input
                    id="return-period"
                    type="number"
                    value={profile.return_period_days}
                    onChange={(e) => updateProfile('return_period_days', parseInt(e.target.value) || 30)}
                    min="1"
                    max="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="return-method">Return Method</Label>
                  <Select value={profile.return_method} onValueChange={(value) => updateProfile('return_method', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                      <SelectItem value="EXCHANGE">Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Different Return Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a different address for returns
                  </p>
                </div>
                <Switch
                  checked={profile.use_different_return_address}
                  onCheckedChange={(checked) => updateProfile('use_different_return_address', checked)}
                />
              </div>

              {profile.use_different_return_address && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <div className="space-y-2">
                    <Label htmlFor="return-address1">Return Address Line 1</Label>
                    <Input
                      id="return-address1"
                      value={profile.return_address_line1}
                      onChange={(e) => updateProfile('return_address_line1', e.target.value)}
                      placeholder="Return address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="return-city">City</Label>
                      <Input
                        id="return-city"
                        value={profile.return_city}
                        onChange={(e) => updateProfile('return_city', e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="return-state">State</Label>
                      <Input
                        id="return-state"
                        value={profile.return_state}
                        onChange={(e) => updateProfile('return_state', e.target.value)}
                        placeholder="State"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="return-postal">ZIP Code</Label>
                      <Input
                        id="return-postal"
                        value={profile.return_postal_code}
                        onChange={(e) => updateProfile('return_postal_code', e.target.value)}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Preferences</CardTitle>
          <CardDescription>
            Default shipping and handling settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handling-time">Handling Time (Days)</Label>
              <Input
                id="handling-time"
                type="number"
                value={profile.handling_time_days}
                onChange={(e) => updateProfile('handling_time_days', parseInt(e.target.value) || 1)}
                min="1"
                max="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping-service">Preferred Shipping Service</Label>
              <Select value={profile.preferred_shipping_service} onValueChange={(value) => updateProfile('preferred_shipping_service', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usps_priority">USPS Priority Mail</SelectItem>
                  <SelectItem value="usps_ground">USPS Ground Advantage</SelectItem>
                  <SelectItem value="ups_ground">UPS Ground</SelectItem>
                  <SelectItem value="fedex_ground">FedEx Ground</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>International Shipping</Label>
              <p className="text-sm text-muted-foreground">
                Enable shipping to international destinations
              </p>
            </div>
            <Switch
              checked={profile.international_shipping_enabled}
              onCheckedChange={(checked) => updateProfile('international_shipping_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Shipping Costs</Label>
              <p className="text-sm text-muted-foreground">
                Configure default shipping costs for eBay listings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domestic-shipping-cost">Domestic Shipping Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="domestic-shipping-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profile.shipping_cost_domestic}
                    onChange={(e) => updateProfile('shipping_cost_domestic', parseFloat(e.target.value) || 0)}
                    className="pl-8"
                    placeholder="9.95"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost for first item shipping within the US
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-shipping-cost">Additional Item Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="additional-shipping-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={profile.shipping_cost_additional}
                    onChange={(e) => updateProfile('shipping_cost_additional', parseFloat(e.target.value) || 0)}
                    className="pl-8"
                    placeholder="2.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost for each additional item in the same order
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Settings</CardTitle>
          <CardDescription>
            Default markup and pricing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="markup-percentage">Default Markup Percentage</Label>
            <Input
              id="markup-percentage"
              type="number"
              value={profile.default_markup_percentage}
              onChange={(e) => updateProfile('default_markup_percentage', parseFloat(e.target.value) || 100)}
              min="0"
              step="1"
            />
            <p className="text-sm text-muted-foreground">
              Default markup to apply when calculating listing prices from cost basis
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Location Management */}
      <InventoryLocationManager />

      {/* SKU Management Section */}
      <SKUSettingsSection />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Save Business Settings'}
        </Button>
      </div>
    </div>
  );
};

export default UserBusinessTab;