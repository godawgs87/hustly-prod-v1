-- Fix the get_category_path function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION get_category_path(category_id text)
RETURNS TABLE(
  ebay_category_id text,
  category_name text,
  parent_ebay_category_id text,
  level int,
  leaf_category boolean,
  full_path text
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_path AS (
    -- Base case: start with the selected category
    SELECT 
      ec.ebay_category_id,
      ec.category_name,
      ec.parent_ebay_category_id,
      0 as level,
      ec.leaf_category
    FROM ebay_categories ec
    WHERE ec.ebay_category_id = category_id
      AND ec.is_active = true
    
    UNION ALL
    
    -- Recursive case: get parent categories
    SELECT 
      ec.ebay_category_id,
      ec.category_name,
      ec.parent_ebay_category_id,
      cp.level + 1,
      ec.leaf_category
    FROM ebay_categories ec
    JOIN category_path cp ON ec.ebay_category_id = cp.parent_ebay_category_id
    WHERE ec.is_active = true
  )
  SELECT 
    cp.ebay_category_id,
    cp.category_name,
    cp.parent_ebay_category_id,
    cp.level,
    cp.leaf_category,
    string_agg(cp.category_name, ' > ' ORDER BY cp.level DESC) as full_path
  FROM category_path cp
  GROUP BY cp.ebay_category_id, cp.category_name, cp.parent_ebay_category_id, cp.level, cp.leaf_category
  ORDER BY cp.level DESC;
END;
$$ LANGUAGE plpgsql;