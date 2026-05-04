-- Spurgeon sermon library: additive migration (safe for shared dev/prod DB)
-- Run in Supabase SQL Editor before deploying app code that depends on these objects.

-- 1) Hide bulk sermon templates from Resources "rest" list without removing is_public later
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS include_in_resources_menu BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.include_in_resources_menu IS
  'When false, profile is omitted from public Resources dropdown ordering (e.g. Spurgeon sermon templates). Default true for existing rows.';

CREATE INDEX IF NOT EXISTS idx_profiles_include_in_resources_menu
  ON public.profiles (include_in_resources_menu)
  WHERE include_in_resources_menu = false;

-- 2) Verse → sermon lookup (passage_key aligns with scripture_cache / referenceToApiBiblePassageId)
CREATE TABLE IF NOT EXISTS public.spurgeon_passage_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_key TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  sermon_no INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (passage_key, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_spurgeon_passage_index_passage_key
  ON public.spurgeon_passage_index (passage_key);

CREATE INDEX IF NOT EXISTS idx_spurgeon_passage_index_profile_id
  ON public.spurgeon_passage_index (profile_id);

COMMENT ON TABLE public.spurgeon_passage_index IS
  'Maps normalized passage keys to Spurgeon sermon profiles for scripture modal Study + library modal.';

ALTER TABLE public.spurgeon_passage_index ENABLE ROW LEVEL SECURITY;

-- Read-only for app users (API uses service role for writes / filtered reads as needed)
CREATE POLICY "Anyone can read spurgeon passage index"
  ON public.spurgeon_passage_index
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes use Supabase service role (bypasses RLS).

-- 3) Optional: allow anonymous SELECT on public templates only (skip if you already have permissive "view all profiles")
-- Uncomment ONLY when production uses restrictive profiles SELECT and anon cannot open /slug for is_public templates:
-- CREATE POLICY "Anon can select public templates"
--   ON public.profiles
--   FOR SELECT
--   TO anon
--   USING (is_template = true AND is_public = true);
