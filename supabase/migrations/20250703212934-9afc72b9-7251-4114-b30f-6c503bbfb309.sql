-- Add inventory location fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS inventory_location_name text,
ADD COLUMN IF NOT EXISTS inventory_address_line1 text,
ADD COLUMN IF NOT EXISTS inventory_address_line2 text,
ADD COLUMN IF NOT EXISTS inventory_city text,
ADD COLUMN IF NOT EXISTS inventory_state text,
ADD COLUMN IF NOT EXISTS inventory_postal_code text,
ADD COLUMN IF NOT EXISTS inventory_country text DEFAULT 'US';