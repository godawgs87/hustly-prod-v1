-- Add missing eBay DEV_ID secret placeholder
-- Note: User will need to add EBAY_DEV_ID to Supabase secrets
-- This is just a placeholder to document the requirement

-- Update marketplace_accounts table to improve eBay integration
-- Add better indexes for eBay-specific queries
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_platform_user_active 
ON marketplace_accounts(platform, user_id, is_active, is_connected) 
WHERE platform = 'ebay';

-- Add comments to clarify eBay-specific fields
COMMENT ON COLUMN marketplace_accounts.oauth_token IS 'For eBay: stores eBayAuthToken from Trading API';
COMMENT ON COLUMN marketplace_accounts.oauth_expires_at IS 'For eBay: HardExpirationTime from FetchToken response';
COMMENT ON COLUMN marketplace_accounts.refresh_token IS 'For eBay: not used in Trading API, reserved for future use';

-- Optimize listings table for eBay publishing
CREATE INDEX IF NOT EXISTS idx_listings_ebay_publish 
ON listings(user_id, status, title, price, condition) 
WHERE status IN ('draft', 'active');

-- Add performance optimization for platform_listings
CREATE INDEX IF NOT EXISTS idx_platform_listings_ebay_sync
ON platform_listings(user_id, platform, status, last_synced_at)
WHERE platform = 'ebay';