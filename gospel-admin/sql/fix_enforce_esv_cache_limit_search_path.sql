-- Fix search_path for enforce_esv_cache_limit function
-- This is the correct version with 2 parameters that's currently in the database

CREATE OR REPLACE FUNCTION public.enforce_esv_cache_limit(
  p_current_total_verses INTEGER DEFAULT NULL,
  p_max_verses INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
  current_total INTEGER;
  ref_to_delete TEXT;
BEGIN
  -- Use provided verse count if available, otherwise estimate from cache
  IF p_current_total_verses IS NOT NULL THEN
    current_total := p_current_total_verses;
  ELSE
    -- Fallback: estimate from cache entry count (conservative)
    SELECT COUNT(*) INTO current_total
    FROM scripture_cache
    WHERE translation = 'esv';
  END IF;
  
  -- If under limit, no action needed
  IF current_total <= p_max_verses THEN
    RETURN 0;
  END IF;
  
  -- Delete oldest entries until under limit
  -- Prioritize whole chapters (references without ':') over individual verses
  -- This is LRU (Least Recently Used) eviction with chapter preference
  WHILE current_total > p_max_verses LOOP
    -- First try to delete oldest whole chapter (no ':' in reference)
    SELECT reference INTO ref_to_delete
    FROM scripture_cache
    WHERE translation = 'esv'
      AND reference NOT LIKE '%:%'  -- Whole chapters don't have ':'
    ORDER BY cached_at ASC
    LIMIT 1;
    
    -- If no chapters found, delete oldest verse reference
    IF ref_to_delete IS NULL THEN
      SELECT reference INTO ref_to_delete
      FROM scripture_cache
      WHERE translation = 'esv'
      ORDER BY cached_at ASC
      LIMIT 1;
    END IF;
    
    -- Exit if nothing to delete
    IF ref_to_delete IS NULL THEN
      EXIT;
    END IF;
    
    -- Delete the selected reference
    DELETE FROM scripture_cache
    WHERE translation = 'esv'
      AND reference = ref_to_delete;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count = 0 THEN
      EXIT; -- No more entries to delete
    END IF;
    
    total_deleted := total_deleted + deleted_count;
    
    -- Decrement count (approximation - caller should recalculate)
    current_total := current_total - 1;
  END LOOP;
  
  RETURN total_deleted;
END;
$$;

-- Verify the fix
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN '✓ Fixed'
    ELSE '✗ Still needs fix'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'enforce_esv_cache_limit';
