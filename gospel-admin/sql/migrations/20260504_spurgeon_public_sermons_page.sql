-- Paginated public Spurgeon sermon list with stable catalog ordering (matches sortBySpurgeonSermonSlug.ts).
-- Run in Supabase before relying on GET /api/spurgeon/sermons for large corpora (> prior fetch cap).

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
      COALESCE(
        CASE
          WHEN trim(p.title) ~* '^\s*sermon\s+[0-9]+'
            THEN (regexp_match(trim(p.title), '^\s*sermon\s+([0-9]+)', 'i'))[1]::bigint
        END,
        CASE
          WHEN lower(trim(p.slug)) ~ '^sg[0-9]+$'
            THEN substring(lower(trim(p.slug)) from '^sg([0-9]+)$')::bigint
        END,
        9223372036854775807
      ) AS sort_key,
      CASE
        WHEN lower(trim(p.slug)) ~ '^sg[0-9]+$'
          THEN substring(lower(trim(p.slug)) from '^sg([0-9]+)$')::bigint
        ELSE 0
      END AS slug_num
    FROM public.profiles p
    WHERE p.is_template = true
      AND p.is_public = true
      AND p.slug LIKE 'sg%'
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR p.title ILIKE '%' || btrim(p_q) || '%'
        OR p.slug ILIKE '%' || btrim(p_q) || '%'
      )
  ),
  page AS (
    SELECT b.slug, b.title, b.sort_key, b.slug_num
    FROM base b
    ORDER BY b.sort_key ASC NULLS LAST, b.slug_num ASC, b.slug ASC
    OFFSET GREATEST(0, p_offset)
    LIMIT LEAST(1000, GREATEST(1, p_limit))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*)::bigint FROM base),
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', pg.slug, 'title', coalesce(pg.title, ''))
          ORDER BY pg.sort_key ASC NULLS LAST, pg.slug_num ASC, pg.slug ASC
        )
        FROM page pg
      ),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) IS
  'Public Spurgeon templates: filter, count, order by catalog (title Sermon N else sg digits), paginate. Used by /api/spurgeon/sermons.';

REVOKE ALL ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spurgeon_public_sermons_page(text, int, int) TO service_role;
