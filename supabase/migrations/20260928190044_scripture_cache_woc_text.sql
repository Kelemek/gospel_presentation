-- Red-letter markup lives in `woc_text`; `text` stays plain for legacy API clients.

ALTER TABLE scripture_cache
  ADD COLUMN IF NOT EXISTS woc_text TEXT;

COMMENT ON COLUMN scripture_cache.text IS 'Cached passage plain text (no words-of-Christ markers)';
COMMENT ON COLUMN scripture_cache.woc_text IS 'Optional parallel passage with inline words-of-Christ markers for red-letter reader';
