-- First update existing data to use underscores instead of hyphens
UPDATE public.user_profiles 
SET subscription_tier = 'side_hustler' 
WHERE subscription_tier = 'side-hustler';

UPDATE public.user_profiles 
SET subscription_tier = 'serious_seller' 
WHERE subscription_tier = 'serious-seller';

UPDATE public.user_profiles 
SET subscription_tier = 'full_time_flipper' 
WHERE subscription_tier = 'full-time-flipper';

-- Drop existing constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

-- Create new constraint with underscored tier names
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_tier_check 
CHECK (subscription_tier IN ('trial', 'side_hustler', 'serious_seller', 'full_time_flipper', 'founders'));