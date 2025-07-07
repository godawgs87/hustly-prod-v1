
-- Clean up duplicate and invalid listings data
WITH duplicate_listings AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, title, price, category, status 
           ORDER BY created_at DESC
         ) as rn
  FROM public.listings
  WHERE title LIKE '%Merged Item%' OR title = '' OR title IS NULL
)
DELETE FROM public.listings 
WHERE id IN (
  SELECT id FROM duplicate_listings WHERE rn > 1
);

-- Update any remaining invalid titles
UPDATE public.listings 
SET title = CONCAT('Item ', SUBSTRING(id::text, 1, 8))
WHERE title LIKE '%Merged Item%' OR title = '' OR title IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_user_status_created 
ON public.listings(user_id, status, created_at DESC);

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_listings_title_search 
ON public.listings USING gin(to_tsvector('english', title));

-- Ensure measurements column has proper default
UPDATE public.listings 
SET measurements = '{}'::jsonb 
WHERE measurements IS NULL OR measurements = 'null'::jsonb;
