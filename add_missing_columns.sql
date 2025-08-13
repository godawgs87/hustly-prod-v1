-- Add all missing columns needed for eBay import
-- Run this in your Supabase SQL Editor

-- Add platform column (for multi-marketplace support)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'manual';

-- Add quantity column (for inventory tracking)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add ebay_item_id column (for eBay tracking)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ebay_item_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_platform ON listings(platform);
CREATE INDEX IF NOT EXISTS idx_listings_ebay_item_id ON listings(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_listings_quantity ON listings(quantity);

-- Add unique constraint for eBay items
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_ebay_item_id_unique 
ON listings(user_id, ebay_item_id) 
WHERE ebay_item_id IS NOT NULL;

-- Verify all columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name IN ('platform', 'quantity', 'ebay_item_id')
ORDER BY column_name;
