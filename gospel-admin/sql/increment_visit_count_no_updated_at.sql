-- Stop bumping profiles.updated_at on visit tracking.
-- Visit increments must not invalidate client offline cache (/api/profiles/[slug]/modified).
-- Run in Supabase SQL Editor (idempotent).

CREATE OR REPLACE FUNCTION public.increment_visit_count(profile_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    visit_count = visit_count + 1,
    last_visited = NOW()
  WHERE slug = profile_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_visit_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_visit_count(TEXT) TO anon;
