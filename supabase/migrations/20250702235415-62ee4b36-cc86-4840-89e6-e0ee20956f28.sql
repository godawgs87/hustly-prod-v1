-- Performance optimization indexes for database timeout issues
-- These indexes will dramatically improve query performance and reduce timeouts

-- Essential indexes for listings table performance
CREATE INDEX IF NOT EXISTS idx_listings_user_created_desc ON listings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_user_status_created ON listings(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_performance_query ON listings(user_id, status) WHERE status IN ('active', 'draft', 'sold');

-- Indexes for eBay integration queries
CREATE INDEX IF NOT EXISTS idx_listings_single_fetch ON listings(id, user_id) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_ebay ON marketplace_accounts(user_id, platform, is_connected, is_active) WHERE platform = 'ebay';

-- Platform listings performance
CREATE INDEX IF NOT EXISTS idx_platform_listings_user_listing ON platform_listings(user_id, listing_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_listings_sync_status ON platform_listings(user_id, sync_status, platform);

-- Analyze tables for better query planning
ANALYZE listings;
ANALYZE marketplace_accounts;
ANALYZE platform_listings;