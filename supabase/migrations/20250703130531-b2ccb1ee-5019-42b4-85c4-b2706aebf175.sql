-- Add new fields to user_profiles table for business settings
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS business_phone text,
ADD COLUMN IF NOT EXISTS use_different_return_address boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS return_address_line1 text,
ADD COLUMN IF NOT EXISTS return_address_line2 text,
ADD COLUMN IF NOT EXISTS return_city text,
ADD COLUMN IF NOT EXISTS return_state text,
ADD COLUMN IF NOT EXISTS return_postal_code text,
ADD COLUMN IF NOT EXISTS return_country text DEFAULT 'US',
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'individual';