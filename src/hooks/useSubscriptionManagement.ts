import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string;
  subscription_status: string;
  subscription_end?: string;
}

interface UsageData {
  photos_used: number;
  photos_limit: number;
  over_limit: boolean;
}

export const useSubscriptionManagement = () => {
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const { toast } = useToast();

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus | null> => {
    try {
      setChecking(true);
      
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { action: 'check_subscription' }
      });

      if (error) throw error;

      setSubscriptionStatus(data);
      return data;
    } catch (error: any) {
      console.error('Subscription check failed:', error);
      toast({
        title: "Subscription Check Failed",
        description: error.message || 'Failed to check subscription status',
        variant: "destructive"
      });
      return null;
    } finally {
      setChecking(false);
    }
  }, [toast]);

  const createCheckout = useCallback(async (plan: 'starter' | 'professional' | 'enterprise'): Promise<string | null> => {
    try {
      setCreating(true);
      
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { 
          action: 'create_checkout',
          plan 
        }
      });

      if (error) throw error;

      // Open checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }

      return data.url;
    } catch (error: any) {
      console.error('Checkout creation failed:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || 'Failed to create checkout session',
        variant: "destructive"
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [toast]);

  const openCustomerPortal = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { action: 'customer_portal' }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Customer portal failed:', error);
      toast({
        title: "Portal Failed",
        description: error.message || 'Failed to open customer portal',
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateUsage = useCallback(async (type: 'photo_analysis', count: number = 1): Promise<UsageData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { 
          action: 'update_usage',
          type,
          count 
        }
      });

      if (error) throw error;

      if (data.over_limit) {
        toast({
          title: "Usage Limit Reached",
          description: `You've reached your monthly limit of ${data.usage.photos_limit} photo analyses.`,
          variant: "destructive"
        });
      }

      return data.usage;
    } catch (error: any) {
      console.error('Usage update failed:', error);
      return null;
    }
  }, [toast]);

  // Auto-check subscription on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    subscriptionStatus,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    updateUsage,
    checking,
    creating
  };
};