-- Add LRU enforcement function for ESV cache limit (max 500 verses)
-- This function removes oldest entries when ESV cache exceeds the limit
-- Only creates function if it doesn't already exist

CREATE OR REPLACE FUNCTION enforce_esv_cache_limit(p_max_verses INTEGER DEFAULT 500)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  excess_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count current ESV cache entries
  SELECT COUNT(*) INTO current_count
  FROM scripture_cache
  WHERE translation = 'esv';
  
  -- If under limit, no action needed
  IF current_count <= p_max_verses THEN
    RETURN 0;
  END IF;
  
  -- Calculate how many entries to delete
  excess_count := current_count - p_max_verses;
  
  -- Delete oldest (least recently used) entries
  DELETE FROM scripture_cache
  WHERE translation = 'esv'
    AND reference IN (
      SELECT reference
      FROM scripture_cache
      WHERE translation = 'esv'
      ORDER BY cached_at ASC
      LIMIT excess_count
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION enforce_esv_cache_limit IS 'Enforces LRU cache limit for ESV API (max 500 verses). Deletes oldest entries when over limit. Returns count of deleted entries.';
