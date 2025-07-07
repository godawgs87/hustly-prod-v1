
-- Add indexes to improve query performance for user-specific listings
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_created ON public.listings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON public.listings (user_id, status);

-- Add a partial index for active listings (commonly queried)
CREATE INDEX IF NOT EXISTS idx_listings_user_active ON public.listings (user_id, created_at DESC) 
WHERE status = 'active';
