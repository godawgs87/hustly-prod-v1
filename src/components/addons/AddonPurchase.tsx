import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Zap } from 'lucide-react';
import { ADDON_TYPES, ADDON_PRICING } from '@/utils/constants';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddonPurchaseProps {
  className?: string;
}

export const AddonPurchase: React.FC<AddonPurchaseProps> = ({ className }) => {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { currentTier, userAddons, getBillingCycleInfo } = useFeatureAccess();
  const { toast } = useToast();
  const billingInfo = getBillingCycleInfo();

  const handlePurchase = async (addonType: string) => {
    try {
      setPurchasing(addonType);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase add-ons",
          variant: "destructive"
        });
        return;
      }

      const addon = ADDON_PRICING[addonType as keyof typeof ADDON_PRICING];
      
      // For now, we'll simulate the purchase - in production this would integrate with Stripe
      const { error } = await supabase
        .from('user_addons')
        .insert({
          user_id: session.user.id,
          addon_type: addonType,
          addon_value: addon.value,
          price_paid: addon.price,
          billing_cycle_start: billingInfo.cycleStart.toISOString().split('T')[0],
          billing_cycle_end: billingInfo.cycleEnd.toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Add-on Purchased!",
        description: `${addon.name} has been added to your account.`,
      });

      // Refresh the page to update the add-ons
      window.location.reload();
    } catch (error: any) {
      console.error('Add-on purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || 'Failed to purchase add-on',
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };

  const isAddonActive = (addonType: string) => {
    return userAddons.some(addon => addon.addon_type === addonType);
  };

  const getAddonIcon = (addonType: string) => {
    switch (addonType) {
      case ADDON_TYPES.EXTRA_LISTINGS:
        return <Plus className="h-5 w-5" />;
      case ADDON_TYPES.EXTRA_MARKETPLACE:
        return <ShoppingCart className="h-5 w-5" />;
      case ADDON_TYPES.BULK_UPLOAD_BOOST:
        return <Zap className="h-5 w-5" />;
      default:
        return <Plus className="h-5 w-5" />;
    }
  };

  const getAddonAvailability = (addonType: string) => {
    switch (addonType) {
      case ADDON_TYPES.BULK_UPLOAD_BOOST:
        return currentTier === 'side_hustler';
      case ADDON_TYPES.EXTRA_LISTINGS:
        return currentTier !== 'full_time_flipper'; // Not needed for unlimited plans
      case ADDON_TYPES.EXTRA_MARKETPLACE:
        return true;
      default:
        return true;
    }
  };

  const availableAddons = Object.entries(ADDON_PRICING).filter(([type]) => 
    getAddonAvailability(type)
  );

  if (availableAddons.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Boost Your Plan</h2>
        <p className="text-muted-foreground">
          Add extra features to your current plan without upgrading
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableAddons.map(([type, addon]) => {
          const isActive = isAddonActive(type);
          const isPurchasing = purchasing === type;
          
          return (
            <Card key={type} className={`relative ${isActive ? 'ring-2 ring-primary' : ''}`}>
              {isActive && (
                <Badge className="absolute -top-2 left-4 bg-primary">
                  Active
                </Badge>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  {getAddonIcon(type)}
                  <CardTitle className="text-lg">{addon.name}</CardTitle>
                </div>
                <CardDescription>{addon.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold">${addon.price}</span>
                    <span className="text-muted-foreground text-sm">/cycle</span>
                  </div>
                  
                  <Button
                    size="sm"
                    disabled={isActive || isPurchasing}
                    onClick={() => handlePurchase(type)}
                  >
                    {isPurchasing ? (
                      'Purchasing...'
                    ) : isActive ? (
                      'Active'
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Add-ons are billed for the current billing cycle only. 
          They will automatically expire at the end of your billing cycle.
        </p>
      </div>
    </div>
  );
};