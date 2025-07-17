-- Improve the search_categories function for better automotive and keyword matching
CREATE OR REPLACE FUNCTION public.search_categories(search_term text, limit_count integer DEFAULT 50)
 RETURNS TABLE(ebay_category_id text, category_name text, parent_ebay_category_id text, leaf_category boolean, match_score double precision, full_path text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH category_matches AS (
    SELECT 
      ec.ebay_category_id,
      ec.category_name,
      ec.parent_ebay_category_id,
      ec.leaf_category,
      CASE 
        -- Exact match gets highest score
        WHEN lower(ec.category_name) = lower(search_term) THEN 100.0::double precision
        
        -- Starts with search term
        WHEN lower(ec.category_name) LIKE lower(search_term) || '%' THEN 95.0::double precision
        
        -- Contains exact search term
        WHEN lower(ec.category_name) LIKE '%' || lower(search_term) || '%' THEN 85.0::double precision
        
        -- Enhanced automotive keyword matching
        WHEN lower(search_term) IN ('key fob', 'key', 'fob', 'remote', 'transponder', 'keyless') 
             AND (lower(ec.category_name) LIKE '%key%' OR lower(ec.category_name) LIKE '%fob%' 
                  OR lower(ec.category_name) LIKE '%remote%' OR lower(ec.category_name) LIKE '%transponder%') 
        THEN 90.0::double precision
        
        -- Enhanced automotive category detection
        WHEN (lower(search_term) LIKE '%car%' OR lower(search_term) LIKE '%auto%' OR lower(search_term) LIKE '%vehicle%' OR lower(search_term) LIKE '%ford%' OR lower(search_term) LIKE '%automotive%')
             AND (lower(ec.category_name) LIKE '%motor%' OR lower(ec.category_name) LIKE '%car%' 
                  OR lower(ec.category_name) LIKE '%auto%' OR lower(ec.category_name) LIKE '%vehicle%'
                  OR lower(ec.category_name) LIKE '%key%' OR lower(ec.category_name) LIKE '%transponder%') 
        THEN 88.0::double precision
        
        -- Word boundary matching for better relevance
        WHEN EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(ec.category_name), ' ')) as word 
          WHERE word = lower(search_term)
        ) THEN 80.0::double precision
        
        -- Partial word matching
        WHEN EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(ec.category_name), ' ')) as word 
          WHERE word LIKE lower(search_term) || '%'
        ) THEN 70.0::double precision
        
        -- Multi-word search support
        WHEN EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(search_term), ' ')) as search_word
          WHERE lower(ec.category_name) LIKE '%' || search_word || '%'
        ) THEN 60.0::double precision
        
        ELSE 30.0::double precision
      END as match_score
    FROM ebay_categories ec
    WHERE ec.is_active = true
      AND ec.ebay_category_id IS NOT NULL 
      AND ec.category_name IS NOT NULL
      AND trim(ec.ebay_category_id) != ''
      AND trim(ec.category_name) != ''
      AND (
        -- Basic text matching
        lower(ec.category_name) LIKE '%' || lower(search_term) || '%'
        
        -- Enhanced automotive matching
        OR (
          (lower(search_term) LIKE '%key%' OR lower(search_term) LIKE '%fob%' OR lower(search_term) LIKE '%remote%')
          AND (lower(ec.category_name) LIKE '%key%' OR lower(ec.category_name) LIKE '%fob%' OR lower(ec.category_name) LIKE '%remote%' OR lower(ec.category_name) LIKE '%transponder%')
        )
        
        -- Multi-word search
        OR EXISTS (
          SELECT 1 FROM unnest(string_to_array(lower(search_term), ' ')) as search_word
          WHERE search_word != '' AND lower(ec.category_name) LIKE '%' || search_word || '%'
        )
      )
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
  WHERE cwp.match_score >= 30.0
  ORDER BY 
    cwp.match_score DESC, 
    -- Prefer leaf categories for direct selection
    CASE WHEN cwp.leaf_category = true THEN 0 ELSE 1 END,
    -- Prefer categories with shorter paths (more specific)
    length(cwp.full_path),
    cwp.category_name
  LIMIT limit_count;
END;
$function$;