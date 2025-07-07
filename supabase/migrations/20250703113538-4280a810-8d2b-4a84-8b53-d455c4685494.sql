-- Add performance index for inventory queries
CREATE INDEX IF NOT EXISTS idx_listings_user_created_at ON listings (user_id, created_at DESC);

-- Add index for platform listings sync
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user_platform ON marketplace_accounts (user_id, platform, is_connected, is_active);

-- Add index for photos optimization
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos (listing_id, photo_order);

-- Add function to get listing with optimized photo loading
CREATE OR REPLACE FUNCTION get_listing_with_photos(listing_id_param UUID)
RETURNS TABLE (
  listing_data JSONB,
  photo_urls TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(l.*) as listing_data,
    COALESCE(
      ARRAY(
        SELECT storage_path 
        FROM listing_photos lp 
        WHERE lp.listing_id = listing_id_param 
        ORDER BY lp.photo_order 
        LIMIT 5
      ), 
      ARRAY[]::TEXT[]
    ) as photo_urls
  FROM listings l
  WHERE l.id = listing_id_param;
END;
$$ LANGUAGE plpgsql;