-- Admin-only staff: remove profile assignment usage and align RLS with public profiles + admin maintenance.
-- Run in Supabase SQL Editor after deploying app changes that no longer use profile_access or counselor flows.
--
-- 1) Clears all profile_access rows (assignments).
-- 2) Promotes former counselors to admin (staff who managed profiles/templates).
-- 3) Leaves legacy `counselee` rows unchanged by default (app no longer exposes counselee flows; they cannot use admin routes).
--    Optional: uncomment ONE of the blocks in section B to promote counselees or leave explicit no-op.
-- 4) Drops counselor/counselee-dependent RLS on profiles and profile_access; recreates minimal policies.

-- =============================================================================
-- A) Data cleanup and role backfill
-- =============================================================================

DELETE FROM public.profile_access;

UPDATE public.user_profiles
SET role = 'admin'
WHERE role = 'counselor';

-- -----------------------------------------------------------------------------
-- B) Counselee role (choose explicitly for your org — default is no DB change)
-- -----------------------------------------------------------------------------
-- Option (a) Promote all remaining counselees to admin (use only if approved):
-- UPDATE public.user_profiles SET role = 'admin' WHERE role = 'counselee';
--
-- Option (b) Default: do nothing — rows may remain role = 'counselee' until manually updated.

-- =============================================================================
-- C) profile_access: remove all client-facing policies (service_role bypasses RLS)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;

-- =============================================================================
-- D) profiles: replace legacy SELECT/UPDATE/DELETE with admin + public presentation
-- =============================================================================

-- SELECT — drop known historical policy names, then single permissive read for anon + authenticated
DROP POLICY IF EXISTS "Anyone can view default profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles - anyone sees all or counselor controls" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templates" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templ" ON public.profiles;
DROP POLICY IF EXISTS "Profile visibility with counselee access" ON public.profiles;
DROP POLICY IF EXISTS "Profile visibility with counselee and template access" ON public.profiles;

CREATE POLICY "Anyone can view all profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- UPDATE — allow anonymous progress/saved answers paths; admins bypass in app; creators may update own non-default
DROP POLICY IF EXISTS "Anyone can update their progress" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own non-templates" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own, anyone update progress" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own, counselees update accessible" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles" ON public.profiles;

CREATE POLICY "Update profiles"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (
  (SELECT auth.uid()) IS NULL
  OR get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
);

-- DELETE — admins or profile owner (non-default, non-template)
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-default" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-template non-default" ON public.profiles;

CREATE POLICY "Admins delete all, creators delete own non-template non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (
    created_by = (SELECT auth.uid())
    AND is_default = false
    AND is_template = false
  )
);

-- INSERT (unchanged semantics; drop if name differs and recreate)
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;

CREATE POLICY "Authenticated users can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- =============================================================================
-- E) user_profiles: remove counselor-wide user directory policy if present
-- =============================================================================

DROP POLICY IF EXISTS "Counselors can view all user profiles" ON public.user_profiles;
