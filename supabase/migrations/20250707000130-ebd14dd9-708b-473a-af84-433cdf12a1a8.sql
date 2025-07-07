-- Migration to populate ebay_category_id for existing listings based on general category
-- This provides intelligent mapping from general categories to eBay category IDs

UPDATE public.listings 
SET 
  ebay_category_id = CASE 
    WHEN category = 'Clothing' THEN '11450' -- Women's Clothing
    WHEN category = 'Shoes' THEN '11504' -- Women's Shoes  
    WHEN category = 'Accessories' THEN '4250' -- Jewelry & Watches
    WHEN category = 'Electronics' THEN '58058' -- Cell Phones & Accessories
    WHEN category = 'Home & Garden' THEN '11700' -- Home & Garden
    WHEN category = 'Sports & Outdoors' THEN '888' -- Sporting Goods
    WHEN category = 'Books' THEN '267' -- Books
    WHEN category = 'Toys & Games' THEN '220' -- Toys & Hobbies
    WHEN category = 'Health & Beauty' THEN '26395' -- Health & Beauty
    ELSE '99' -- Everything Else (fallback)
  END,
  ebay_category_path = CASE 
    WHEN category = 'Clothing' THEN 'Clothing, Shoes & Accessories > Women''s Clothing'
    WHEN category = 'Shoes' THEN 'Clothing, Shoes & Accessories > Women''s Shoes'
    WHEN category = 'Accessories' THEN 'Jewelry & Watches'
    WHEN category = 'Electronics' THEN 'Cell Phones & Accessories'
    WHEN category = 'Home & Garden' THEN 'Home & Garden'
    WHEN category = 'Sports & Outdoors' THEN 'Sporting Goods'
    WHEN category = 'Books' THEN 'Books'
    WHEN category = 'Toys & Games' THEN 'Toys & Hobbies'
    WHEN category = 'Health & Beauty' THEN 'Health & Beauty'
    ELSE 'Everything Else'
  END
WHERE ebay_category_id IS NULL 
  AND category IS NOT NULL;