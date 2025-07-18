import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePhotoUsageTracking = () => {
  const { toast } = useToast();

  const trackPhotoUsage = async (photosAnalyzed: number): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No authenticated user found for photo usage tracking');
        return false;
      }

      // Get current usage
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('photos_used_this_month, monthly_photo_limit, last_photo_reset_date')
        .eq('id', session.user.id)
        .single();

      if (!currentProfile) {
        console.error('Could not fetch user profile for photo usage tracking');
        return false;
      }

      // Check if we need to reset the monthly counter
      const today = new Date();
      const lastResetDate = currentProfile.last_photo_reset_date ? new Date(currentProfile.last_photo_reset_date) : null;
      const shouldReset = !lastResetDate || (
        today.getMonth() !== lastResetDate.getMonth() || 
        today.getFullYear() !== lastResetDate.getFullYear()
      );

      const currentUsage = shouldReset ? 0 : (currentProfile.photos_used_this_month || 0);
      const newUsage = currentUsage + photosAnalyzed;
      const photoLimit = currentProfile.monthly_photo_limit || 50;

      // Check if this would exceed the limit
      if (photoLimit !== -1 && newUsage > photoLimit) {
        toast({
          title: "Photo Analysis Limit Exceeded",
          description: `You have used ${currentUsage}/${photoLimit} photos this month. This analysis would exceed your limit.`,
          variant: "destructive"
        });
        return false;
      }

      // Update the usage
      const updateData: any = {
        photos_used_this_month: newUsage,
        updated_at: new Date().toISOString()
      };

      if (shouldReset) {
        updateData.last_photo_reset_date = today.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating photo usage:', error);
        return false;
      }

      console.log(`Photo usage tracked: ${newUsage}/${photoLimit} photos used this month`);
      return true;
    } catch (error) {
      console.error('Error in photo usage tracking:', error);
      return false;
    }
  };

  const checkPhotoUsageLimit = async (photosToAnalyze: number): Promise<{ canProceed: boolean; currentUsage: number; limit: number }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return { canProceed: false, currentUsage: 0, limit: 50 };
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('photos_used_this_month, monthly_photo_limit, last_photo_reset_date, user_role')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        return { canProceed: false, currentUsage: 0, limit: 50 };
      }

      // Admin and testers have unlimited access
      if (profile.user_role === 'admin' || profile.user_role === 'tester') {
        return { canProceed: true, currentUsage: profile.photos_used_this_month || 0, limit: -1 };
      }

      // Check if we need to reset the monthly counter
      const today = new Date();
      const lastResetDate = profile.last_photo_reset_date ? new Date(profile.last_photo_reset_date) : null;
      const shouldReset = !lastResetDate || (
        today.getMonth() !== lastResetDate.getMonth() || 
        today.getFullYear() !== lastResetDate.getFullYear()
      );

      const currentUsage = shouldReset ? 0 : (profile.photos_used_this_month || 0);
      const photoLimit = profile.monthly_photo_limit || 50;

      const wouldExceed = photoLimit !== -1 && (currentUsage + photosToAnalyze) > photoLimit;

      return {
        canProceed: !wouldExceed,
        currentUsage,
        limit: photoLimit
      };
    } catch (error) {
      console.error('Error checking photo usage limit:', error);
      return { canProceed: false, currentUsage: 0, limit: 50 };
    }
  };

  return {
    trackPhotoUsage,
    checkPhotoUsageLimit
  };
};