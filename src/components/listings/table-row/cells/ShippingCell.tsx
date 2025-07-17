
import React, { useEffect, useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface ShippingCellProps {
  shippingCost: number | null;
}

const ShippingCell = ({ shippingCost }: ShippingCellProps) => {
  const [defaultShippingCost, setDefaultShippingCost] = useState<number>(7.95);
  
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
            'USPSGround': 7.95,
            'USPSPriority': 9.95,
            'USPSPriorityFlatRateBox': 9.95,
            'USPSPriorityFlatRateEnvelope': 9.95,
            'USPSPriorityExpress': 24.95,
            'usps_priority': 9.95, // Legacy mapping
            'usps_ground': 7.95, // Legacy mapping
            'usps_first_class': 5.95, // Legacy mapping
            'usps_media': 4.95, // Legacy mapping
            'usps_express': 24.95, // Legacy mapping
            'ups_ground': 7.95, // Legacy mapping
            'fedex_ground': 7.95, // Legacy mapping
            'other': 7.95
          };
          setDefaultShippingCost(serviceCosts[profile.preferred_shipping_service as keyof typeof serviceCosts] || 7.95);
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
