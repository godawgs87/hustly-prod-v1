-- Create essential indexes to fix query timeouts
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user_platform ON marketplace_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_listings_user_platform ON platform_listings(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos(listing_id);