import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEbayIntegration } from '@/hooks/useEbayIntegration';
import BulkEbaySyncManager from './BulkEbaySyncManager';
import type { Listing } from '@/types/Listing';

interface InventorySyncManagerProps {
  selectedItems: string[];
  selectedListings: Listing[];
  onSyncComplete: () => void;
}

const InventorySyncManager = ({ selectedItems, selectedListings, onSyncComplete }: InventorySyncManagerProps) => {
  const { toast } = useToast();
  const [ebayAccount, setEbayAccount] = useState<any>(null);
  
  // Check eBay connection on mount
  React.useEffect(() => {
    const checkEbayConnection = async () => {
      const { data } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .maybeSingle();
      setEbayAccount(data);
    };
    checkEbayConnection();
  }, []);

  return (
    <div className="flex gap-2">
      {/* Enhanced Bulk Sync Component */}
      <BulkEbaySyncManager 
        selectedListings={selectedListings}
        onSyncComplete={onSyncComplete}
      />

      {/* Settings Button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => window.location.href = '/settings'}
      >
        ⚙
      </Button>

      {/* Selection Info */}
      {selectedItems.length > 0 && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {selectedItems.length} selected
        </Badge>
      )}
    </div>
  );
};

export default InventorySyncManager;