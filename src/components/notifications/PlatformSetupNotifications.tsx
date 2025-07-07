import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface PlatformSetupNotificationsProps {
  isVisible: boolean;
  onDismiss: () => void;
  onRemindLater: () => void;
  triggerContext?: 'listing_sync' | 'general_check';
  platformAttempted?: string;
}

interface MissingSetup {
  type: 'ebay_connection' | 'ebay_policies' | 'business_info' | 'inventory_location';
  title: string;
  description: string;
  action: string;
  severity: 'critical' | 'warning' | 'info';
  settingsTab?: string;
}

const PlatformSetupNotifications = ({ 
  isVisible, 
  onDismiss, 
  onRemindLater, 
  triggerContext,
  platformAttempted 
}: PlatformSetupNotificationsProps) => {
  const [missingSetups, setMissingSetups] = useState<MissingSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isVisible && user) {
      checkMissingSetups();
    }
  }, [isVisible, user, platformAttempted]);

  const checkMissingSetups = async () => {
    setLoading(true);
    const missing: MissingSetup[] = [];

    try {
      // Check user profile for business info and policies
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

      // Only check eBay-specific requirements if attempting eBay sync or if user has eBay selected
      const shouldCheckEbay = platformAttempted === 'ebay' || 
                              triggerContext === 'listing_sync' ||
                              ebayAccount;

      if (shouldCheckEbay) {
        // Check eBay connection
        if (!ebayAccount) {
          missing.push({
            type: 'ebay_connection',
            title: 'eBay Account Not Connected',
            description: 'Connect your eBay account to start listing items automatically.',
            action: 'Connect eBay',
            severity: 'critical',
            settingsTab: 'connections'
          });
        }

        // Check business policies (only if eBay is connected)
        if (ebayAccount && (!profile?.ebay_payment_policy_id || !profile?.ebay_return_policy_id || !profile?.ebay_fulfillment_policy_id)) {
          missing.push({
            type: 'ebay_policies',
            title: 'eBay Business Policies Missing',
            description: 'eBay requires payment, return, and fulfillment policies for listings.',
            action: 'Create Policies',
            severity: 'critical',
            settingsTab: 'connections'
          });
        }
      }

      // Check basic business info (universal)
      if (!profile?.business_name || !profile?.shipping_city || !profile?.shipping_address_line1) {
        missing.push({
          type: 'business_info',
          title: 'Business Information Incomplete',
          description: 'Complete your business address and shipping information.',
          action: 'Complete Business Info',
          severity: 'warning',
          settingsTab: 'business'
        });
      }

      // Check inventory location (for platforms that need it)
      if (shouldCheckEbay && ebayAccount && !profile?.inventory_location_name) {
        missing.push({
          type: 'inventory_location',
          title: 'Inventory Location Missing',
          description: 'Set up your inventory location for accurate shipping calculations.',
          action: 'Set Inventory Location',
          severity: 'info',
          settingsTab: 'business'
        });
      }

      setMissingSetups(missing);
    } catch (error) {
      console.error('Error checking missing setups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (setup: MissingSetup) => {
    const baseUrl = '/settings';
    const tabParam = setup.settingsTab ? `?tab=${setup.settingsTab}` : '';
    window.open(`${baseUrl}${tabParam}`, '_blank');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Settings className="w-5 h-5 text-blue-500" />;
      default: return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!isVisible || missingSetups.length === 0) return null;

  const criticalIssues = missingSetups.filter(s => s.severity === 'critical');
  const hasBlockingIssues = criticalIssues.length > 0;

  return (
    <Dialog open={isVisible} onOpenChange={onDismiss}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span>Setup Required</span>
              </DialogTitle>
              <DialogDescription>
                {hasBlockingIssues 
                  ? `Complete these required steps before ${platformAttempted ? `syncing to ${platformAttempted}` : 'creating listings'}.`
                  : 'We recommend completing these setup steps for the best experience.'
                }
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {missingSetups.map((setup, index) => (
            <Alert key={index} className={getSeverityColor(setup.severity)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getSeverityIcon(setup.severity)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{setup.title}</h4>
                      <Badge 
                        variant={setup.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {setup.severity === 'critical' ? 'Required' : 'Recommended'}
                      </Badge>
                    </div>
                    <AlertDescription className="text-gray-600">
                      {setup.description}
                    </AlertDescription>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleActionClick(setup)}
                  className="ml-4 shrink-0"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  {setup.action}
                </Button>
              </div>
            </Alert>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onRemindLater}
          >
            Remind Me Later
          </Button>
          
          <div className="space-x-2">
            <Button
              variant="ghost"
              onClick={onDismiss}
            >
              I'll Set This Up Later
            </Button>
            <Button
              onClick={() => {
                const firstCritical = criticalIssues[0] || missingSetups[0];
                if (firstCritical) {
                  handleActionClick(firstCritical);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Complete Setup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformSetupNotifications;