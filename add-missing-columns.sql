-- Add missing columns to existing tables

-- Add photos column to listings table (JSONB array for photo URLs)
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Ensure user_profiles has all required columns
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS photos_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_photo_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_photo_reset_date DATE DEFAULT CURRENT_DATE;

-- Add any other missing columns that might be needed
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS ebay_item_id TEXT,
ADD COLUMN IF NOT EXISTS platform_status TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create index on photos column for better performance
CREATE INDEX IF NOT EXISTS idx_listings_photos ON public.listings USING gin(photos);

-- Update any existing listings to have empty photos array if null
UPDATE public.listings 
SET photos = '[]'::jsonb 
WHERE photos IS NULL;
