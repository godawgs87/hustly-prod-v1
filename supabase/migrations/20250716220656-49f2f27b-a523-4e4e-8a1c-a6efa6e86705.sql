-- Drop both existing constraints
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;

-- Update existing data to use underscores
UPDATE public.user_profiles 
SET subscription_tier = 'side_hustler' 
WHERE subscription_tier = 'side-hustler';

UPDATE public.user_profiles 
SET subscription_tier = 'serious_seller' 
WHERE subscription_tier = 'serious-seller';

UPDATE public.user_profiles 
SET subscription_tier = 'full_time_flipper' 
WHERE subscription_tier = 'full-time-flipper';

-- Create new constraints that match the application
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_tier_check 
CHECK (subscription_tier IN ('trial', 'side_hustler', 'serious_seller', 'full_time_flipper', 'founders'));

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_status_check 
CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing'));