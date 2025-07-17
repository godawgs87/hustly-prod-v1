
import React, { useEffect, useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface ShippingCellProps {
  shippingCost: number | null;
}

const ShippingCell = ({ shippingCost }: ShippingCellProps) => {
  const [defaultShippingCost, setDefaultShippingCost] = useState<number>(9.95);
  
  useEffect(() => {
    const loadUserShippingDefault = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferred_shipping_service')
          .eq('id', user.id)
          .single();

        // Set shipping cost based on user's preferred service (aligned with valid eBay service codes)
        if (profile?.preferred_shipping_service) {
          const serviceCosts = {
            'usps_priority': 9.95,
            'usps_ground': 7.95,
            'usps_first_class': 5.95,
            'usps_media': 4.95,
            'usps_express': 24.95,
            'ups_ground': 12.95,
            'fedex_ground': 11.95,
            'other': 9.95
          };
          setDefaultShippingCost(serviceCosts[profile.preferred_shipping_service as keyof typeof serviceCosts] || 9.95);
        }
      } catch (error) {
        console.error('Error loading user shipping preferences:', error);
      }
    };

    loadUserShippingDefault();
  }, []);
  
  // Handle shipping cost display
  let displayCost: number;
  
  if (shippingCost === 0) {
    displayCost = 0;
  } else if (shippingCost === null || shippingCost === undefined) {
    displayCost = defaultShippingCost;
  } else {
    displayCost = shippingCost;
  }
  
  return (
    <TableCell className="text-right">
      ${displayCost.toFixed(2)}
    </TableCell>
  );
};

export default ShippingCell;
