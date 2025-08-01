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

      // Handle the response properly - check if it's nested or direct
      const subscriptionData = data?.data || data;
      
      if (subscriptionData) {
        setSubscriptionStatus(subscriptionData);
        return subscriptionData;
      }

      // Fallback to reading from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_status, subscription_ends_at')
        .single();

      if (!profileError && profileData) {
        const fallbackData = {
          subscribed: profileData.subscription_status === 'active',
          subscription_tier: profileData.subscription_tier || 'trial',
          subscription_status: profileData.subscription_status || 'active',
          subscription_end: profileData.subscription_ends_at
        };
        setSubscriptionStatus(fallbackData);
        return fallbackData;
      }

      return null;
    } catch (error: any) {
      console.error('Subscription check failed:', error);
      
      // Try fallback to user_profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('subscription_tier, subscription_status, subscription_ends_at')
          .single();

        if (!profileError && profileData) {
          const fallbackData = {
            subscribed: profileData.subscription_status === 'active',
            subscription_tier: profileData.subscription_tier || 'trial',
            subscription_status: profileData.subscription_status || 'active',
            subscription_end: profileData.subscription_ends_at
          };
          setSubscriptionStatus(fallbackData);
          return fallbackData;
        }
      } catch (fallbackError) {
        console.error('Fallback subscription check failed:', fallbackError);
      }

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

  const getPaymentMethods = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { action: 'get_payment_methods' }
      });

      if (error) throw error;
      return data.payment_methods || [];
    } catch (error: any) {
      console.error('Payment methods fetch failed:', error);
      return [];
    }
  }, []);

  const getBillingHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: { action: 'get_billing_history' }
      });

      if (error) throw error;
      return data.invoices || [];
    } catch (error: any) {
      console.error('Billing history fetch failed:', error);
      return [];
    }
  }, []);

  // Check subscription only when user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        checkSubscription();
      }
    };
    checkAuth();
  }, [checkSubscription]);

  return {
    subscriptionStatus,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    updateUsage,
    getPaymentMethods,
    getBillingHistory,
    checking,
    creating
  };
};