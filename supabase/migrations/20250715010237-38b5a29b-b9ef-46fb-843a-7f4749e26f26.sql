-- Add missing RLS policy to allow admins to update user profiles
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');