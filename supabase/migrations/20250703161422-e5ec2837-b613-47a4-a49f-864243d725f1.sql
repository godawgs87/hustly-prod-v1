-- Add ebay_category_path field to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ebay_category_path TEXT;