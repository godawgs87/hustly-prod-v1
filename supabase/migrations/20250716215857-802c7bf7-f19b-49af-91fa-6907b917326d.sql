-- Fix subscription tier constraint to accept underscored values instead of hyphenated
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

-- Create new constraint with underscored tier names that match the application
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_tier_check 
CHECK (subscription_tier IN ('trial', 'side_hustler', 'serious_seller', 'full_time_flipper', 'founders'));