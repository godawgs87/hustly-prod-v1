import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Check, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface InventoryLocationManagerProps {
  onSuccess?: () => void;
}

const InventoryLocationManager = ({ onSuccess }: InventoryLocationManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useDifferentLocation, setUseDifferentLocation] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({});
  const [inventoryLocation, setInventoryLocation] = useState({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: ''
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data || {});
      
      // Check if user already has a custom inventory location
      if (data?.inventory_location_name && 
          data.inventory_location_name !== data.business_name) {
        setUseDifferentLocation(true);
        setInventoryLocation({
          name: data.inventory_location_name || '',
          address_line1: data.inventory_address_line1 || '',
          city: data.inventory_city || '',
          state: data.inventory_state || '',
          postal_code: data.inventory_postal_code || ''
        });
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = useDifferentLocation 
        ? {
            inventory_location_name: inventoryLocation.name || 'Custom Location',
            inventory_address_line1: inventoryLocation.address_line1,
            inventory_city: inventoryLocation.city,
            inventory_state: inventoryLocation.state,
            inventory_postal_code: inventoryLocation.postal_code
          }
        : {
            inventory_location_name: userProfile.business_name || 'Default Location',
            inventory_address_line1: userProfile.shipping_address_line1,
            inventory_city: userProfile.shipping_city,
            inventory_state: userProfile.shipping_state,
            inventory_postal_code: userProfile.shipping_postal_code
          };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Inventory Location Saved",
        description: "Your inventory location has been updated successfully."
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving inventory location:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save inventory location",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasBusinessAddress = userProfile.shipping_address_line1 && 
                            userProfile.shipping_city;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Inventory Location</span>
        </CardTitle>
        <CardDescription>
          Set up where your inventory is stored for shipping calculations and platform requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasBusinessAddress && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please complete your business address in the Business tab first.
            </AlertDescription>
          </Alert>
        )}

        {hasBusinessAddress && (
          <>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Default Location</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{userProfile.business_name || 'Your Business'}</p>
                <p className="text-sm text-gray-600">
                  {userProfile.shipping_address_line1}<br />
                  {userProfile.shipping_city}, {userProfile.shipping_state} {userProfile.shipping_postal_code}
                </p>
              </div>
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

            <Button
              onClick={handleSave}
              disabled={saving || !hasBusinessAddress}
              className="w-full"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Inventory Location
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryLocationManager;