import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface SetupCheck {
  hasEbayConnection: boolean;
  hasEbayPolicies: boolean;
  hasBusinessInfo: boolean;
  hasInventoryLocation: boolean;
}

export const usePlatformSetupCheck = () => {
  const [setupStatus, setSetupStatus] = useState<SetupCheck>({
    hasEbayConnection: false,
    hasEbayPolicies: false,
    hasBusinessInfo: false,
    hasInventoryLocation: false
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkSetupStatus();
    }
  }, [user]);

  const checkSetupStatus = async () => {
    setLoading(true);
    try {
      // Check user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Check marketplace accounts
      const { data: accounts } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user?.id);

      const ebayAccount = accounts?.find(acc => acc.platform === 'ebay' && acc.is_connected);

      setSetupStatus({
        hasEbayConnection: !!ebayAccount,
        hasEbayPolicies: !!(profile?.ebay_payment_policy_id && 
                           profile?.ebay_return_policy_id && 
                           profile?.ebay_fulfillment_policy_id),
        hasBusinessInfo: !!(profile?.business_name && 
                           profile?.shipping_city && 
                           profile?.shipping_address_line1),
        hasInventoryLocation: !!profile?.inventory_location_name
      });
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setLoading(false);
    }
  };

  const needsEbaySetup = (forSync = false) => {
    if (!forSync) return false;
    
    return !setupStatus.hasEbayConnection || 
           (setupStatus.hasEbayConnection && !setupStatus.hasEbayPolicies);
  };

  const needsBusinessSetup = () => {
    return !setupStatus.hasBusinessInfo;
  };

  return {
    setupStatus,
    loading,
    checkSetupStatus,
    needsEbaySetup,
    needsBusinessSetup
  };
};