-- Spurgeon library search: also match when the user omits punctuation (e.g. "davids" finds "David's").
-- Replaces public.spurgeon_public_sermons_page; apply after 20260504_spurgeon_public_sermons_page.sql.

CREATE OR REPLACE FUNCTION public.spurgeon_public_sermons_page(
  p_q text DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.slug::text AS slug,
      p.title::text AS title,
      lower(
        trim(
          coalesce(
            nullif(
              trim(
                regexp_replace(
                  trim(coalesce(p.title, '')),
                  '^\s*sermon\s+[0-9]+(?:-[0-9]+)?\.\s*',
                  '',
                  'i'
                )
              ),
              ''
            ),
            trim(coalesce(p.title, ''))
          )
        )
      ) AS sort_az
    FROM public.profiles p
    WHERE p.is_template = true
      AND p.is_public = true
      AND p.slug LIKE 'sg%'
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR p.title ILIKE '%' || btrim(p_q) || '%'
        OR p.slug ILIKE '%' || btrim(p_q) || '%'
        OR (
          length(regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g')) > 0
          AND (
            regexp_replace(lower(trim(coalesce(p.title, ''))), '[^a-z0-9]+', '', 'g')
              LIKE '%' || regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g') || '%'
            OR regexp_replace(lower(trim(coalesce(p.slug, ''))), '[^a-z0-9]+', '', 'g')
              LIKE '%' || regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g') || '%'
          )
        )
      )
  ),
  page AS (
    SELECT b.slug, b.title, b.sort_az
    FROM base b
    ORDER BY b.sort_az ASC, b.slug ASC
    OFFSET GREATEST(0, p_offset)
    LIMIT LEAST(1000, GREATEST(1, p_limit))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*)::bigint FROM base),
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', pg.slug, 'title', coalesce(pg.title, ''))
          ORDER BY pg.sort_az ASC, pg.slug ASC
        )
        FROM page pg
      ),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) IS
  'Public Spurgeon templates: filter (ILIKE + punctuation-insensitive alphanumeric match), count, order A–Z by stripped title, paginate.';

REVOKE ALL ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) TO service_role;
