import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Store, User, Settings, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import OnboardingBusinessInfo from './steps/OnboardingBusinessInfo';
import OnboardingPlatformSelection from './steps/OnboardingPlatformSelection';
import OnboardingPlatformSetup from './steps/OnboardingPlatformSetup';
import OnboardingInventoryLocation from './steps/OnboardingInventoryLocation';

interface UniversalOnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const steps = [
  { id: 'welcome', title: 'Welcome', icon: User },
  { id: 'business', title: 'Business Info', icon: Store },
  { id: 'platforms', title: 'Choose Platform', icon: Settings },
  { id: 'setup', title: 'Platform Setup', icon: MapPin },
  { id: 'inventory', title: 'Inventory Location', icon: MapPin }
];

const UniversalOnboardingFlow = ({ isOpen, onComplete }: UniversalOnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [businessData, setBusinessData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [ebayConnected, setEbayConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load saved step on mount
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step');
    if (saved) {
      const savedStep = parseInt(saved, 10);
      if (savedStep >= 0 && savedStep < steps.length) {
        setCurrentStep(savedStep);
      }
    }
  }, []);

  // Check eBay connection status periodically during setup step
  useEffect(() => {
    if (currentStep === 3 && selectedPlatforms.includes('ebay')) { // Platform setup step
      const checkConnection = async () => {
        try {
          const { data } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('platform', 'ebay')
            .eq('is_connected', true)
            .eq('is_active', true)
            .maybeSingle();

          const isConnected = !!(data && 
            data.oauth_token && 
            data.oauth_token.length > 50 && 
            (!data.oauth_expires_at || new Date(data.oauth_expires_at) > new Date()));

          setEbayConnected(isConnected);
        } catch (error) {
          console.error('Error checking eBay connection:', error);
        }
      };

      checkConnection();
      const interval = setInterval(checkConnection, 2000);
      return () => clearInterval(interval);
    }
  }, [currentStep, selectedPlatforms]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      localStorage.setItem('onboarding_step', nextStep.toString());
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      localStorage.setItem('onboarding_step', prevStep.toString());
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Mark onboarding as complete
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Welcome to Hustly!",
        description: "Your account is set up and ready to go."
      });

      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to complete setup",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Store className="w-10 h-10 text-blue-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Hustly!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Let's set up your reselling business in just a few quick steps. This will help us personalize your experience and get you selling faster.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
        <Card className="text-left">
          <CardContent className="p-4">
            <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
            <h3 className="font-medium text-sm">AI-Powered Listings</h3>
            <p className="text-xs text-gray-600">Smart photo analysis and descriptions</p>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardContent className="p-4">
            <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
            <h3 className="font-medium text-sm">Multi-Platform</h3>
            <p className="text-xs text-gray-600">List on multiple marketplaces</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    const stepId = steps[currentStep].id;
    
    switch (stepId) {
      case 'welcome':
        return renderWelcomeStep();
      case 'business':
        return (
          <OnboardingBusinessInfo
            data={businessData}
            onChange={setBusinessData}
          />
        );
      case 'platforms':
        return (
          <OnboardingPlatformSelection
            selectedPlatforms={selectedPlatforms}
            onChange={setSelectedPlatforms}
          />
        );
      case 'setup':
        return (
          <OnboardingPlatformSetup
            selectedPlatforms={selectedPlatforms}
            businessData={businessData}
            ebayConnected={ebayConnected}
            onEbayConnect={() => setEbayConnected(true)}
          />
        );
      case 'inventory':
        return (
          <OnboardingInventoryLocation
            businessData={businessData}
            selectedPlatforms={selectedPlatforms}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const canProceed = () => {
    const stepId = steps[currentStep].id;
    
    switch (stepId) {
      case 'welcome':
        return true;
      case 'business':
        // Business name is optional for individuals
        const isIndividual = businessData.business_type === 'individual' || businessData.business_type === 'sole_proprietorship';
        const hasRequiredBusinessName = isIndividual || businessData.business_name;
        return businessData.contact_name && hasRequiredBusinessName && businessData.shipping_address_line1 && businessData.shipping_city;
      case 'platforms':
        return selectedPlatforms.length > 0;
      case 'setup':
        // If eBay is selected, require connection before proceeding
        return !selectedPlatforms.includes('ebay') || ebayConnected;
      case 'inventory':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {steps[currentStep].title}
              </span>
            </div>
            <Progress value={(currentStep + 1) / steps.length * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] flex flex-col justify-center">
            {renderCurrentStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            {isLastStep ? (
              <Button
                onClick={handleComplete}
                disabled={loading || !canProceed()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalOnboardingFlow;