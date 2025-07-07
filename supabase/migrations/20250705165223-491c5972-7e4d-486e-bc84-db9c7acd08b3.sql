-- Remove old category system tables and references
-- This migration cleans up the deprecated categories table and related mappings

-- Drop foreign key constraints first
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_id_fkey;
ALTER TABLE category_ebay_mappings DROP CONSTRAINT IF EXISTS category_ebay_mappings_internal_category_id_fkey;

-- Remove category_id column from listings table (we now use ebay_category_id)
ALTER TABLE listings DROP COLUMN IF EXISTS category_id;

-- Drop the category mapping table
DROP TABLE IF EXISTS category_ebay_mappings;

-- Drop the old categories table
DROP TABLE IF EXISTS categories;