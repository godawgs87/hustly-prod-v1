
-- Add more specific composite indexes for common query patterns
-- These will dramatically improve performance for filtered queries

-- Index for user + status + category filtering (very common combination)
CREATE INDEX IF NOT EXISTS idx_listings_user_status_category_created ON public.listings (user_id, status, category, created_at DESC);

-- Index for search functionality on description (currently missing)
CREATE INDEX IF NOT EXISTS idx_listings_description_gin ON public.listings USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;

-- Combined search index for title and description
CREATE INDEX IF NOT EXISTS idx_listings_search_combined ON public.listings USING gin((to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))));

-- Index for user + category + created_at (for category filtering)
CREATE INDEX IF NOT EXISTS idx_listings_user_category_created ON public.listings (user_id, category, created_at DESC) WHERE category IS NOT NULL;

-- Partial index for draft listings (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_listings_user_draft_created ON public.listings (user_id, created_at DESC) WHERE status = 'draft';

-- Index for recent listings (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_listings_user_recent ON public.listings (user_id, created_at DESC, status);

-- Index specifically for the lightweight query pattern (user + limit + order)
CREATE INDEX IF NOT EXISTS idx_listings_lightweight_query ON public.listings (user_id, created_at DESC, status, category) 
WHERE status IS NOT NULL;

-- Update table statistics for better query planning
ANALYZE public.listings;
