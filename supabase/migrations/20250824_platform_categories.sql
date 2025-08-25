-- Add platform_categories JSONB column to listings table for multi-platform category support
-- This field will store platform-specific category data (eBay, Poshmark, Mercari, etc.)

-- Add the platform_categories column
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS platform_categories JSONB DEFAULT NULL;

-- Add index for efficient querying of platform categories
CREATE INDEX IF NOT EXISTS idx_listings_platform_categories 
ON listings USING GIN (platform_categories);

-- Add comment explaining the field structure
COMMENT ON COLUMN listings.platform_categories IS 
'JSONB field storing platform-specific category data. Structure: {
  "ebay": {"category_id": "12345", "category_name": "Electronics", "is_leaf": true, "path": ["Electronics", "Computers"]},
  "poshmark": {...},
  "mercari": {...}
}';

-- Example usage:
-- SELECT * FROM listings WHERE platform_categories->'ebay'->>'category_id' = '12345';
-- SELECT * FROM listings WHERE platform_categories ? 'ebay';
