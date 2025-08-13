-- Add ebay_item_id column to listings table for proper eBay integration
-- This allows us to track eBay listings by their unique Item ID

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ebay_item_id TEXT;

-- Add index for faster lookups by eBay Item ID
CREATE INDEX IF NOT EXISTS idx_listings_ebay_item_id ON listings(ebay_item_id);

-- Add constraint to ensure ebay_item_id is unique per user (no platform filter since column doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_ebay_item_id_unique 
ON listings(user_id, ebay_item_id) 
WHERE ebay_item_id IS NOT NULL;
