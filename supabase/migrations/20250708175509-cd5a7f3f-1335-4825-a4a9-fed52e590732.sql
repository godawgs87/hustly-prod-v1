-- Fix the search_categories function to resolve type mismatch for match_score
CREATE OR REPLACE FUNCTION search_categories(search_term text, limit_count integer DEFAULT 50)
RETURNS TABLE(
  ebay_category_id text,
  category_name text,
  parent_ebay_category_id text,
  leaf_category boolean,
  match_score double precision,
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
        WHEN lower(ec.category_name) = lower(search_term) THEN 100.0::double precision
        WHEN lower(ec.category_name) LIKE lower(search_term) || '%' THEN 90.0::double precision
        WHEN lower(ec.category_name) LIKE '%' || lower(search_term) || '%' THEN 70.0::double precision
        WHEN EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(ec.category_name), ' ')) as word 
          WHERE word LIKE lower(search_term) || '%'
        ) THEN 50.0::double precision
        ELSE 30.0::double precision
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