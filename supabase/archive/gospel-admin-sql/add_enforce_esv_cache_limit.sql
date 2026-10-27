-- Add LRU enforcement function for ESV cache limit (max 500 verses)
-- This function removes oldest entries when ESV cache exceeds the limit
-- Prioritizes deleting whole chapters before individual verses
-- Accepts actual verse count from API for accurate enforcement

-- Drop old versions of the function (in case parameter signature changed)
DROP FUNCTION IF EXISTS enforce_esv_cache_limit(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS enforce_esv_cache_limit(INTEGER);
DROP FUNCTION IF EXISTS enforce_esv_cache_limit();

CREATE OR REPLACE FUNCTION enforce_esv_cache_limit(
  p_current_total_verses INTEGER DEFAULT NULL,
  p_max_verses INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION enforce_esv_cache_limit IS 'Enforces LRU cache limit for ESV API (max 500 verses). Prioritizes deleting whole chapters before individual verses. Accepts actual verse count from API for accurate enforcement. Returns count of deleted entries.';
