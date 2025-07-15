-- Drop existing check constraints
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;

-- Create new check constraints that match the application values
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_tier_check 
CHECK (subscription_tier IN ('trial', 'side-hustler', 'serious-seller', 'full-time-flipper', 'founders'));

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_status_check 
CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing'));