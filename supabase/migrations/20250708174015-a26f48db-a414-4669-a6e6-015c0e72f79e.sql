-- Create server-side category management functions for better performance

-- Function to get root categories (replaces loading all 17K categories)
CREATE OR REPLACE FUNCTION get_root_categories()
RETURNS TABLE(
  ebay_category_id text,
  category_name text,
  leaf_category boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.ebay_category_id,
    ec.category_name,
    ec.leaf_category
  FROM ebay_categories ec
  WHERE ec.is_active = true 
    AND ec.parent_ebay_category_id IS NULL
    AND ec.ebay_category_id IS NOT NULL 
    AND ec.category_name IS NOT NULL
    AND trim(ec.ebay_category_id) != ''
    AND trim(ec.category_name) != ''
  ORDER BY ec.category_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get child categories for lazy loading
CREATE OR REPLACE FUNCTION get_child_categories(parent_id text)
RETURNS TABLE(
  ebay_category_id text,
  category_name text,
  parent_ebay_category_id text,
  leaf_category boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.ebay_category_id,
    ec.category_name,
    ec.parent_ebay_category_id,
    ec.leaf_category
  FROM ebay_categories ec
  WHERE ec.is_active = true 
    AND ec.parent_ebay_category_id = parent_id
    AND ec.ebay_category_id IS NOT NULL 
    AND ec.category_name IS NOT NULL
    AND trim(ec.ebay_category_id) != ''
    AND trim(ec.category_name) != ''
  ORDER BY ec.category_name;
END;
$$ LANGUAGE plpgsql;

-- Function to build complete category path server-side using recursive query
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
  ),
  ordered_path AS (
    SELECT *,
           string_agg(category_name, ' > ') OVER (ORDER BY level DESC ROWS UNBOUNDED PRECEDING) as full_path
    FROM category_path
  )
  SELECT 
    cp.ebay_category_id,
    cp.category_name,
    cp.parent_ebay_category_id,
    cp.level,
    cp.leaf_category,
    op.full_path
  FROM category_path cp
  JOIN ordered_path op ON cp.ebay_category_id = op.ebay_category_id
  ORDER BY cp.level DESC;
END;
$$ LANGUAGE plpgsql;

-- Function for category search with better performance
CREATE OR REPLACE FUNCTION search_categories(search_term text, limit_count int DEFAULT 50)
RETURNS TABLE(
  ebay_category_id text,
  category_name text,
  parent_ebay_category_id text,
  leaf_category boolean,
  match_score float,
  full_path text
) AS $$
BEGIN
  RETURN QUERY
  WITH category_matches AS (
    SELECT 
      ec.ebay_category_id,
      ec.category_name,
      ec.parent_ebay_category_id,
      ec.leaf_category,
      CASE 
        WHEN lower(ec.category_name) = lower(search_term) THEN 100.0
        WHEN lower(ec.category_name) LIKE lower(search_term) || '%' THEN 90.0
        WHEN lower(ec.category_name) LIKE '%' || lower(search_term) || '%' THEN 70.0
        WHEN EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(ec.category_name), ' ')) as word 
          WHERE word LIKE lower(search_term) || '%'
        ) THEN 50.0
        ELSE 30.0
      END as match_score
    FROM ebay_categories ec
    WHERE ec.is_active = true
      AND ec.ebay_category_id IS NOT NULL 
      AND ec.category_name IS NOT NULL
      AND trim(ec.ebay_category_id) != ''
      AND trim(ec.category_name) != ''
      AND lower(ec.category_name) LIKE '%' || lower(search_term) || '%'
  ),
  categories_with_paths AS (
    SELECT 
      cm.*,
      COALESCE(
        (SELECT cp.full_path 
         FROM get_category_path(cm.ebay_category_id) cp 
         ORDER BY cp.level DESC 
         LIMIT 1), 
        cm.category_name
      ) as full_path
    FROM category_matches cm
  )
  SELECT 
    cwp.ebay_category_id,
    cwp.category_name,
    cwp.parent_ebay_category_id,
    cwp.leaf_category,
    cwp.match_score,
    cwp.full_path
  FROM categories_with_paths cwp
  ORDER BY 
    cwp.match_score DESC, 
    CASE WHEN cwp.parent_ebay_category_id IS NULL THEN 0 ELSE 1 END,
    CASE WHEN cwp.leaf_category = true THEN 0 ELSE 1 END,
    cwp.category_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_ebay_categories_parent ON ebay_categories(parent_ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_active ON ebay_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_name ON ebay_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_name_lower ON ebay_categories(lower(category_name));