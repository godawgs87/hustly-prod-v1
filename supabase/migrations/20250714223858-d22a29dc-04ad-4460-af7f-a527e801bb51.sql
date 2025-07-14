-- Add user_role column to user_profiles table for admin/tester access
ALTER TABLE public.user_profiles 
ADD COLUMN user_role TEXT DEFAULT 'user' CHECK (user_role IN ('admin', 'tester', 'user'));

-- Set chadm87@gmail.com as admin by default
UPDATE public.user_profiles 
SET user_role = 'admin' 
WHERE email = 'chadm87@gmail.com';

-- Create index for performance
CREATE INDEX idx_user_profiles_role ON public.user_profiles(user_role);

-- Update RLS policy to allow admins to view all user profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() AND up.user_role = 'admin'
  )
);