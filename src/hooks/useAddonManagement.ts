import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ADDON_PRICING } from '@/utils/constants';

interface PurchaseAddonParams {
  addonType: string;
  billingCycleStart: string;
  billingCycleEnd: string;
}

export const useAddonManagement = () => {
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const purchaseAddon = useCallback(async ({ addonType, billingCycleStart, billingCycleEnd }: PurchaseAddonParams) => {
    try {
      setPurchasing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Authentication required');
      }

      const addon = ADDON_PRICING[addonType as keyof typeof ADDON_PRICING];
      if (!addon) {
        throw new Error('Invalid add-on type');
      }

      // In production, this would integrate with Stripe for payment processing
      // For now, we'll directly insert the add-on
      const { error } = await supabase
        .from('user_addons')
        .insert({
          user_id: session.user.id,
          addon_type: addonType,
          addon_value: addon.value,
          price_paid: addon.price,
          billing_cycle_start: billingCycleStart,
          billing_cycle_end: billingCycleEnd
        });

      if (error) throw error;

      toast({
        title: "Add-on Purchased!",
        description: `${addon.name} has been added to your account.`,
      });

      return true;
    } catch (error: any) {
      console.error('Add-on purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || 'Failed to purchase add-on',
        variant: "destructive"
      });
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [toast]);

  const deactivateAddon = useCallback(async (addonId: string) => {
    try {
      const { error } = await supabase
        .from('user_addons')
        .update({ is_active: false })
        .eq('id', addonId);

      if (error) throw error;

      toast({
        title: "Add-on Deactivated",
        description: "The add-on has been deactivated.",
      });

      return true;
    } catch (error: any) {
      console.error('Add-on deactivation failed:', error);
      toast({
        title: "Deactivation Failed",
        description: error.message || 'Failed to deactivate add-on',
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    purchaseAddon,
    deactivateAddon,
    purchasing
  };
};