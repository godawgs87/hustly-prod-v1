-- Clear existing categories to force fresh sync with correct parent relationships
DELETE FROM ebay_categories WHERE is_active = true;