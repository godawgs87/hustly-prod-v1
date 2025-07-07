-- Add shipping address fields to user_profiles for eBay and other platform integrations
ALTER TABLE public.user_profiles 
ADD COLUMN shipping_address_line1 TEXT,
ADD COLUMN shipping_address_line2 TEXT,
ADD COLUMN shipping_city TEXT,
ADD COLUMN shipping_state TEXT,
ADD COLUMN shipping_postal_code TEXT,
ADD COLUMN shipping_country TEXT DEFAULT 'US';