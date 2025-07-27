import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  user_role: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  has_profile: boolean;
}

export const useAdminUserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: users,
    isLoading,
    error
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        // First, get all user profiles
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profileError) throw profileError;

        // Then, try to get auth users using admin API
        let authUsers: any[] = [];
        try {
          // Use Supabase admin API to get all auth users
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
          if (!authError && authData?.users) {
            authUsers = authData.users;
          }
        } catch (authError) {
          console.warn('Could not fetch auth users (admin access required):', authError);
          // Fallback to just user_profiles if admin access is not available
        }

        // Create a map of profiles by user ID for quick lookup
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        // If we have auth users, merge them with profiles
        if (authUsers.length > 0) {
          const adminUsers: AdminUser[] = authUsers.map(authUser => {
            const profile = profileMap.get(authUser.id);
            return {
              id: authUser.id,
              email: authUser.email || 'No email',
              full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
              user_role: profile?.user_role || 'user',
              subscription_tier: profile?.subscription_tier || 'trial',
              subscription_status: profile?.subscription_status || 'inactive',
              created_at: profile?.created_at || authUser.created_at,
              last_sign_in_at: authUser.last_sign_in_at,
              email_confirmed_at: authUser.email_confirmed_at,
              phone: profile?.business_phone || authUser.phone || null,
              has_profile: !!profile
            };
          });
          return adminUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else {
          // Fallback: just return users with profiles
          const adminUsers: AdminUser[] = (profiles || []).map(profile => ({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            user_role: profile.user_role || 'user',
            subscription_tier: profile.subscription_tier || 'trial',
            subscription_status: profile.subscription_status || 'inactive',
            created_at: profile.created_at,
            last_sign_in_at: null,
            email_confirmed_at: null,
            phone: profile.business_phone || null,
            has_profile: true
          }));
          return adminUsers;
        }
      } catch (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ user_role: role })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update user role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateUserSubscriptionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      tier, 
      status 
    }: { 
      userId: string; 
      tier: string; 
      status: string;
    }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_tier: tier,
          subscription_status: status
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User subscription updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update subscription: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      // For now, we'll use Supabase's admin API to reset password
      // This requires the admin to have proper permissions
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User password reset successfully',
      });
    },
    onError: (error) => {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: `Failed to reset password: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole: updateUserRoleMutation.mutate,
    updateUserSubscription: updateUserSubscriptionMutation.mutate,
    resetUserPassword: resetUserPasswordMutation.mutate,
    isUpdatingRole: updateUserRoleMutation.isPending,
    isUpdatingSubscription: updateUserSubscriptionMutation.isPending,
    isResettingPassword: resetUserPasswordMutation.isPending,
  };
};