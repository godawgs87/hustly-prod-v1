-- Add SKU preference fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS sku_prefix TEXT DEFAULT 'SKU';