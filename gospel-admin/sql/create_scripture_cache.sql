-- Create scripture cache table for ESV and API.Bible responses
-- Caches scripture text by reference and translation to reduce external API calls

CREATE TABLE IF NOT EXISTS scripture_cache (
  reference TEXT NOT NULL,
  translation TEXT NOT NULL,
  text TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (reference, translation)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_scripture_cache_cached_at ON scripture_cache(cached_at);

-- Enable RLS (optional - cache is read-only for most users)
ALTER TABLE scripture_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read cached scripture
CREATE POLICY "Anyone can view scripture cache"
  ON scripture_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can write/update cache (API routes only)
CREATE POLICY "Service role can manage cache"
  ON scripture_cache
  FOR ALL
  TO service_role
  USING (true);

-- Function to automatically delete old cache entries
-- Call this periodically or via cron
CREATE OR REPLACE FUNCTION cleanup_old_scripture_cache(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scripture_cache
  WHERE cached_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get cached scripture (only if not expired)
CREATE OR REPLACE FUNCTION get_cached_scripture(
  p_reference TEXT,
  p_translation TEXT,
  p_ttl_days INTEGER DEFAULT 30
)
RETURNS TABLE (text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT sc.text
  FROM scripture_cache sc
  WHERE sc.reference = p_reference
    AND sc.translation = p_translation
    AND sc.cached_at >= NOW() - (p_ttl_days || ' days')::INTERVAL;
END;
$$;

-- Function to upsert scripture cache
CREATE OR REPLACE FUNCTION upsert_scripture_cache(
  p_reference TEXT,
  p_translation TEXT,
  p_text TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO scripture_cache (reference, translation, text, cached_at)
  VALUES (p_reference, p_translation, p_text, NOW())
  ON CONFLICT (reference, translation)
  DO UPDATE SET
    text = EXCLUDED.text,
    cached_at = NOW();
END;
$$;

-- Optional: Set up automatic cleanup via pg_cron (if available)
-- Runs daily at 3 AM to clean entries older than 30 days
-- Uncomment if you have pg_cron extension enabled:
/*
SELECT cron.schedule(
  'cleanup-scripture-cache',
  '0 3 * * *',  -- 3 AM daily
  $$SELECT cleanup_old_scripture_cache(30)$$
);
*/

COMMENT ON TABLE scripture_cache IS 'Caches scripture text from external APIs (ESV, API.Bible) to reduce rate limit usage';
COMMENT ON COLUMN scripture_cache.reference IS 'Scripture reference (e.g., "John 3:16")';
COMMENT ON COLUMN scripture_cache.translation IS 'Translation code (esv, kjv, nasb, etc.)';
COMMENT ON COLUMN scripture_cache.text IS 'Cached scripture text from API';
COMMENT ON COLUMN scripture_cache.cached_at IS 'Timestamp when this entry was cached';
COMMENT ON FUNCTION cleanup_old_scripture_cache IS 'Deletes scripture cache entries older than specified days (default 30)';
