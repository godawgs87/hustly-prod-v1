-- eBay Item ID Migration
-- Run this in your Supabase SQL Editor to add the ebay_item_id column
-- This is required for the eBay import to work properly

-- Step 1: Add the column if it doesn't exist
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ebay_item_id TEXT;

-- Step 2: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_ebay_item_id 
ON listings(ebay_item_id);

-- Step 3: Add unique constraint to prevent duplicate eBay items per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_ebay_item_id_unique 
ON listings(user_id, ebay_item_id) 
WHERE platform = 'ebay' AND ebay_item_id IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name = 'ebay_item_id';
