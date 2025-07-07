
-- Add composite indexes to dramatically improve query performance
-- These indexes will make filtering and sorting much faster

-- Index for the most common query pattern (user + status + created_at)
CREATE INDEX IF NOT EXISTS idx_listings_user_status_created ON public.listings (user_id, status, created_at DESC);

-- Index for user + category filtering
CREATE INDEX IF NOT EXISTS idx_listings_user_category ON public.listings (user_id, category, created_at DESC);

-- Index for search functionality (title search)
CREATE INDEX IF NOT EXISTS idx_listings_title_gin ON public.listings USING gin(to_tsvector('english', title));

-- Partial index for active/draft listings (commonly queried statuses)
CREATE INDEX IF NOT EXISTS idx_listings_user_active_created ON public.listings (user_id, created_at DESC) 
WHERE status IN ('active', 'draft', 'sold');

-- Index for price-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_listings_user_price ON public.listings (user_id, price DESC, created_at DESC);

-- Analyze the table to update statistics for better query planning
ANALYZE public.listings;
