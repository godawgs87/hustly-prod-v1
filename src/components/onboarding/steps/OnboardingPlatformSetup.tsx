import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, ExternalLink, Info, CheckCircle } from 'lucide-react';
import OnboardingPlatformConnection from './OnboardingPlatformConnection';

interface OnboardingPlatformSetupProps {
  selectedPlatforms: string[];
  businessData: any;
  ebayConnected?: boolean;
  onEbayConnect?: () => void;
}

const OnboardingPlatformSetup = ({ selectedPlatforms, businessData, ebayConnected = false, onEbayConnect }: OnboardingPlatformSetupProps) => {
  const hasEbay = selectedPlatforms.includes('ebay');

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Platform Setup</h2>
        <p className="text-gray-600">
          {hasEbay 
            ? "You can connect your platforms now or skip and set them up later from Settings."
            : "You can set up your platform connections later from the Settings page."
          }
        </p>
      </div>

      {hasEbay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🛒</span>
              <span>eBay Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your eBay account to start listing items automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!ebayConnected && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    eBay integration requires business policies to be created. We'll help you set these up when you connect.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">What you'll need:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Active eBay seller account</li>
                    <li>• Business address ({businessData.shipping_city ? '✓ Already provided' : '⚠️ Required'})</li>
                    <li>• Payment and return policies (we'll create these)</li>
                  </ul>
                </div>
              </>
            )}

            <OnboardingPlatformConnection 
              platformId="ebay"
              isConnected={ebayConnected}
              onConnectionChange={onEbayConnect || (() => {})}
            />
          </CardContent>
        </Card>
      )}

      {selectedPlatforms.filter(p => p !== 'ebay').map(platformId => (
        <Card key={platformId}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{platformId === 'poshmark' ? '👗' : platformId === 'mercari' ? '📦' : '🎨'}</span>
              <span className="capitalize">{platformId}</span>
            </CardTitle>
            <CardDescription>
              {platformId} integration coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {platformId.charAt(0).toUpperCase() + platformId.slice(1)} integration is currently in development. 
                You'll be notified when it's available.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ))}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Don't worry!</h4>
        <p className="text-sm text-gray-600">
          You can skip this step and set up your platform connections anytime from the Settings page. 
          Your business information has been saved and you can start creating listings right away.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPlatformSetup;