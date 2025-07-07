-- Phase 1: Add critical database indexes for inventory performance
-- These indexes will dramatically improve query performance for the inventory system

-- Essential index for user-based queries (most common pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_user_created_optimized 
ON public.listings (user_id, created_at DESC, status);

-- Index for status filtering with user context
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_user_status_fast 
ON public.listings (user_id, status) 
WHERE status IN ('active', 'draft', 'sold', 'pending');

-- Index for the inventory page specific query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_inventory_query 
ON public.listings (user_id, created_at DESC) 
INCLUDE (id, title, price, status, category, condition);

-- Partial index for active inventory management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_inventory 
ON public.listings (user_id, updated_at DESC) 
WHERE status != 'deleted' AND status IS NOT NULL;

-- Analyze tables to update query planner statistics
ANALYZE public.listings;