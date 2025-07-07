
-- Add the missing age_group column to the listings table
ALTER TABLE public.listings 
ADD COLUMN age_group text;

-- Also add other size-related columns that might be missing
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS clothing_size text,
ADD COLUMN IF NOT EXISTS shoe_size text,
ADD COLUMN IF NOT EXISTS gender text;
