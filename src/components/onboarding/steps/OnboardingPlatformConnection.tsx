import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, Loader2, AlertCircle, Key, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlatformRegistry } from '@/services/platforms/PlatformRegistry';

interface OnboardingPlatformConnectionProps {
  platformId: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

const OnboardingPlatformConnection = ({ 
  platformId, 
  isConnected, 
  onConnectionChange 
}: OnboardingPlatformConnectionProps) => {
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  
  const platform = PlatformRegistry.getInstance().get(platformId);
  const platformName = platform?.name || platformId;

  // Determine connection type based on platform
  const getConnectionType = () => {
    switch (platformId) {
      case 'ebay':
      case 'whatnot':
        return 'oauth';
      case 'mercari':
        return 'token';
      case 'poshmark':
      case 'depop':
      case 'facebook':
        return 'browser';
      default:
        return 'manual';
    }
  };

  const connectionType = getConnectionType();

  const initiateOAuthConnection = async () => {
    setConnecting(true);
    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in first.');
      }

      // Platform-specific OAuth endpoints
      const oauthEndpoint = platformId === 'ebay' ? 'ebay-oauth-modern' : `${platformId}-oauth`;

      const { data, error } = await supabase.functions.invoke(oauthEndpoint, {
        body: { 
          action: 'get_auth_url',
          state: 'onboarding_flow',
          origin: window.location.origin
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Redirect in same window
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error(`${platformName} OAuth initiation failed:`, error);
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to initiate ${platformName} connection`,
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  const handleTokenConnection = () => {
    toast({
      title: "Token Connection",
      description: `${platformName} requires an API token. Please visit Settings to configure.`,
    });
  };

  const handleBrowserConnection = () => {
    toast({
      title: "Browser Automation Required",
      description: `${platformName} connection requires browser automation. This feature is coming soon.`,
    });
  };

  const handleConnection = () => {
    switch (connectionType) {
      case 'oauth':
        initiateOAuthConnection();
        break;
      case 'token':
        handleTokenConnection();
        break;
      case 'browser':
        handleBrowserConnection();
        break;
      default:
        toast({
          title: "Manual Setup Required",
          description: `Please configure ${platformName} manually in Settings.`,
        });
    }
  };

  if (isConnected) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>{platformName} Connected!</strong> Your {platformName} account is ready for listing automation.
        </AlertDescription>
      </Alert>
    );
  }

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'oauth':
        return <ExternalLink className="w-4 h-4 mr-2" />;
      case 'token':
        return <Key className="w-4 h-4 mr-2" />;
      case 'browser':
        return <Globe className="w-4 h-4 mr-2" />;
      default:
        return <AlertCircle className="w-4 h-4 mr-2" />;
    }
  };

  const getConnectionButtonText = () => {
    if (connecting) {
      return `Connecting to ${platformName}...`;
    }
    switch (connectionType) {
      case 'oauth':
        return `Connect ${platformName} Account`;
      case 'token':
        return `Configure ${platformName} API Token`;
      case 'browser':
        return `Setup ${platformName} Browser Connection`;
      default:
        return `Configure ${platformName} Manually`;
    }
  };

  const getConnectionFeatures = () => {
    switch (connectionType) {
      case 'oauth':
        return [
          '✓ Secure OAuth connection',
          '✓ No developer account required',
          '✓ Automatic inventory sync'
        ];
      case 'token':
        return [
          '✓ API token authentication',
          '✓ Direct API access',
          '✓ Programmatic control'
        ];
      case 'browser':
        return [
          '✓ Browser automation',
          '✓ No API required',
          '✓ Works with any account type'
        ];
      default:
        return [
          '✓ Manual configuration',
          '✓ Custom integration',
          '✓ Full control'
        ];
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Connect your {platformName} account to enable automatic listing creation and inventory sync.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleConnection}
        disabled={connecting || (connectionType === 'browser')}
        className="w-full"
        variant={connectionType === 'browser' ? 'secondary' : 'default'}
      >
        {connecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {getConnectionButtonText()}
          </>
        ) : (
          <>
            {getConnectionIcon()}
            {getConnectionButtonText()}
          </>
        )}
      </Button>

      {connectionType === 'browser' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Browser automation for {platformName} is coming soon. This will allow automatic listing without an API.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-gray-600 space-y-1">
        {getConnectionFeatures().map((feature, index) => (
          <p key={index}>{feature}</p>
        ))}
      </div>
    </div>
  );
};

export default OnboardingPlatformConnection;
