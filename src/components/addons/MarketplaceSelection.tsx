import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORMS, PLATFORM_NAMES, PLATFORM_ICONS } from '@/utils/constants';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceSelectionProps {
  userTier: string;
  currentMarketplaces: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const MarketplaceSelection: React.FC<MarketplaceSelectionProps> = ({
  userTier,
  currentMarketplaces,
  onClose,
  onSuccess
}) => {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  // Get available marketplaces based on tier
  const getAvailableMarketplaces = () => {
    const allMarketplaces = Object.values(PLATFORMS);
    return allMarketplaces.filter(platform => !currentMarketplaces.includes(platform));
  };

  const availableMarketplaces = getAvailableMarketplaces();

  const handleMarketplaceToggle = (marketplace: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(marketplace)
        ? prev.filter(m => m !== marketplace)
        : [...prev, marketplace]
    );
  };

  const calculateTotal = () => {
    return selectedMarketplaces.length * 10.00; // $10 per marketplace
  };

  const handlePurchase = async () => {
    if (selectedMarketplaces.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one marketplace to purchase.",
        variant: "destructive"
      });
      return;
    }

    try {
      setPurchasing(true);

      // Calculate total and call backend for Stripe checkout
      const total = calculateTotal();
      
      const { data, error } = await supabase.functions.invoke('addon-management', {
        body: {
          action: 'create_checkout',
          addon_type: 'extra_marketplace',
          addon_value: selectedMarketplaces.length,
          price: total * 100, // Convert to cents
          marketplaces: selectedMarketplaces
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout creation failed:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || 'Failed to create checkout session',
        variant: "destructive"
      });
      setPurchasing(false);
    }
  };

  if (availableMarketplaces.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Marketplace Access</CardTitle>
          <CardDescription>
            You already have access to all available marketplaces for your plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Marketplace Access</CardTitle>
        <CardDescription>
          Select marketplaces to add to your account. Each marketplace costs $10.00 for the current billing cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {availableMarketplaces.map((marketplace) => (
            <div
              key={marketplace}
              className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleMarketplaceToggle(marketplace)}
            >
              <Checkbox
                checked={selectedMarketplaces.includes(marketplace)}
                onChange={() => handleMarketplaceToggle(marketplace)}
              />
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-2xl">{PLATFORM_ICONS[marketplace as keyof typeof PLATFORM_ICONS]}</span>
                <div className="flex-1">
                  <h4 className="font-medium">{PLATFORM_NAMES[marketplace as keyof typeof PLATFORM_NAMES]}</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect and list to {PLATFORM_NAMES[marketplace as keyof typeof PLATFORM_NAMES]}
                  </p>
                </div>
                <Badge variant="secondary">$10.00</Badge>
              </div>
            </div>
          ))}
        </div>

        {selectedMarketplaces.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">
                Total ({selectedMarketplaces.length} marketplace{selectedMarketplaces.length > 1 ? 's' : ''})
              </span>
              <span className="font-bold text-lg">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={selectedMarketplaces.length === 0 || purchasing}
            className="flex-1"
          >
            {purchasing ? 'Processing...' : `Purchase ${selectedMarketplaces.length > 0 ? `(${selectedMarketplaces.length})` : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceSelection;