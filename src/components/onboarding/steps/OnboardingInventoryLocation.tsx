import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Check, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface OnboardingInventoryLocationProps {
  businessData: any;
  selectedPlatforms: string[];
}

const OnboardingInventoryLocation = ({ businessData, selectedPlatforms }: OnboardingInventoryLocationProps) => {
  const [useDifferentLocation, setUseDifferentLocation] = useState(false);
  const [inventoryLocation, setInventoryLocation] = useState({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const hasEbay = selectedPlatforms.includes('ebay');

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save business data to user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          ...businessData,
          // Use business address as default for inventory unless user specified different
          inventory_location_name: useDifferentLocation 
            ? inventoryLocation.name || 'Default Location'
            : businessData.business_name || 'Default Location',
          inventory_address_line1: useDifferentLocation 
            ? inventoryLocation.address_line1 
            : businessData.shipping_address_line1,
          inventory_city: useDifferentLocation 
            ? inventoryLocation.city 
            : businessData.shipping_city,
          inventory_state: useDifferentLocation 
            ? inventoryLocation.state 
            : businessData.shipping_state,
          inventory_postal_code: useDifferentLocation 
            ? inventoryLocation.postal_code 
            : businessData.shipping_postal_code
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      setSaved(true);
      toast({
        title: "Business Information Saved",
        description: "Your business setup is complete!"
      });
    } catch (error: any) {
      console.error('Error saving business data:', error);
      toast({
        title: "Save Error",
        description: error.message || "Failed to save business information",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Inventory Location</h2>
        <p className="text-gray-600">
          Set up where your inventory is stored. This is used for shipping calculations and platform requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Inventory Location</CardTitle>
          <CardDescription>
            By default, we'll use your business address as your inventory location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">
              {businessData.business_name || 'Your Business'}
            </h4>
            <p className="text-sm text-gray-600">
              {businessData.shipping_address_line1}<br />
              {businessData.shipping_city}, {businessData.shipping_state} {businessData.shipping_postal_code}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use different inventory location</Label>
              <p className="text-sm text-muted-foreground">
                Specify a different warehouse or storage location
              </p>
            </div>
            <Switch
              checked={useDifferentLocation}
              onCheckedChange={setUseDifferentLocation}
            />
          </div>

          {useDifferentLocation && (
            <div className="space-y-4 pl-4 border-l-2 border-border">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  value={inventoryLocation.name}
                  onChange={(e) => setInventoryLocation({...inventoryLocation, name: e.target.value})}
                  placeholder="Warehouse, Storage Unit, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-address">Address Line 1</Label>
                <Input
                  id="location-address"
                  value={inventoryLocation.address_line1}
                  onChange={(e) => setInventoryLocation({...inventoryLocation, address_line1: e.target.value})}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location-city">City</Label>
                  <Input
                    id="location-city"
                    value={inventoryLocation.city}
                    onChange={(e) => setInventoryLocation({...inventoryLocation, city: e.target.value})}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-state">State</Label>
                  <Input
                    id="location-state"
                    value={inventoryLocation.state}
                    onChange={(e) => setInventoryLocation({...inventoryLocation, state: e.target.value})}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-postal">ZIP Code</Label>
                  <Input
                    id="location-postal"
                    value={inventoryLocation.postal_code}
                    onChange={(e) => setInventoryLocation({...inventoryLocation, postal_code: e.target.value})}
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasEbay && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            eBay requires inventory locations for business accounts. We'll automatically create this when you connect your eBay account.
          </AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full"
      >
        {saving ? (
          'Saving...'
        ) : saved ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Saved Successfully
          </>
        ) : (
          'Save Business Information'
        )}
      </Button>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-medium text-green-900 mb-1">Setup Complete!</h4>
          <p className="text-sm text-green-700">
            Your business information has been saved. You're ready to start creating listings!
          </p>
        </div>
      )}
    </div>
  );
};

export default OnboardingInventoryLocation;