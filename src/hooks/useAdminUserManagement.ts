import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_role: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, user_role, subscription_tier, subscription_status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
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

  return {
    users,
    isLoading,
    error,
    updateUserRole: updateUserRoleMutation.mutate,
    updateUserSubscription: updateUserSubscriptionMutation.mutate,
    isUpdatingRole: updateUserRoleMutation.isPending,
    isUpdatingSubscription: updateUserSubscriptionMutation.isPending,
  };
};