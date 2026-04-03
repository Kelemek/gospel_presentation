-- KJV, NASB, LSB, NIV, NLT, CSB via API.Bible (rest.api.bible). Run in Supabase SQL editor after deploy.
-- Requires env: API_BIBLE_KEY, API_BIBLE_BIBLE_ID_KJV, API_BIBLE_BIBLE_ID_NASB, API_BIBLE_BIBLE_ID_LSB,
--               API_BIBLE_BIBLE_ID_NIV, API_BIBLE_BIBLE_ID_NLT, API_BIBLE_BIBLE_ID_CSB

INSERT INTO translation_settings (translation_code, translation_name, is_enabled, display_order)
VALUES
  ('niv', 'NIV (New International Version)', false, 5),
  ('nlt', 'NLT (New Living Translation)', false, 6),
  ('csb', 'CSB (Christian Standard Bible)', false, 7)
ON CONFLICT (translation_code) DO UPDATE SET
  translation_name = EXCLUDED.translation_name,
  display_order = EXCLUDED.display_order;

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS valid_translation;

ALTER TABLE user_profiles
ADD CONSTRAINT valid_translation CHECK (
  preferred_translation IN ('esv', 'kjv', 'nasb', 'lsb', 'niv', 'nlt', 'csb')
);

-- LRU cache limit per translation (same behavior as enforce_esv_cache_limit)
CREATE OR REPLACE FUNCTION public.enforce_translation_cache_limit(
  p_translation TEXT,
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
  IF p_current_total_verses IS NOT NULL THEN
    current_total := p_current_total_verses;
  ELSE
    SELECT COUNT(*) INTO current_total
    FROM scripture_cache
    WHERE translation = p_translation;
  END IF;

  IF current_total <= p_max_verses THEN
    RETURN 0;
  END IF;

  WHILE current_total > p_max_verses LOOP
    SELECT reference INTO ref_to_delete
    FROM scripture_cache
    WHERE translation = p_translation
      AND reference NOT LIKE '%:%'
    ORDER BY cached_at ASC
    LIMIT 1;

    IF ref_to_delete IS NULL THEN
      SELECT reference INTO ref_to_delete
      FROM scripture_cache
      WHERE translation = p_translation
      ORDER BY cached_at ASC
      LIMIT 1;
    END IF;

    IF ref_to_delete IS NULL THEN
      EXIT;
    END IF;

    DELETE FROM scripture_cache
    WHERE translation = p_translation
      AND reference = ref_to_delete;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count = 0 THEN
      EXIT;
    END IF;

    total_deleted := total_deleted + deleted_count;
    current_total := current_total - 1;
  END LOOP;

  RETURN total_deleted;
END;
$$;

COMMENT ON FUNCTION public.enforce_translation_cache_limit IS
  'LRU eviction for scripture_cache rows for a given API-backed translation. Max verses default 500.';

SELECT translation_code, translation_name, is_enabled, display_order
FROM translation_settings
ORDER BY display_order;
