import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export const useOnboardingStatus = () => {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        setNeedsOnboarding(false);
      } else {
        setNeedsOnboarding(!profile?.onboarding_completed);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setNeedsOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingComplete = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (!error) {
        setNeedsOnboarding(false);
        localStorage.removeItem('onboarding_step');
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const saveCurrentStep = (step: number) => {
    setCurrentStep(step);
    localStorage.setItem('onboarding_step', step.toString());
  };

  const loadSavedStep = () => {
    const saved = localStorage.getItem('onboarding_step');
    return saved ? parseInt(saved, 10) : 0;
  };

  return {
    needsOnboarding,
    loading,
    currentStep,
    markOnboardingComplete,
    checkOnboardingStatus,
    saveCurrentStep,
    loadSavedStep
  };
};