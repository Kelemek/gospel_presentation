-- Restrict Counselor Profile Access via RLS
-- Counselors see only: their own profiles + default + all templates (read-only)
-- Counselors can update/delete only: their own profiles (not default, not templates)
-- Run this in Supabase SQL Editor
-- Prerequisite: get_user_role(UUID) must exist

-- ============================================================================
-- PART 1: Drop permissive profiles SELECT policy and create restrictive one
-- ============================================================================

DROP POLICY IF EXISTS "View profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templates" ON public.profiles;
DROP POLICY IF EXISTS "Profile visibility with counselee access" ON public.profiles;

CREATE POLICY "Profile visibility with counselee and template access"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
  is_default = true
  OR (
    (SELECT auth.uid()) IS NOT NULL AND (
      get_user_role((SELECT auth.uid())) = 'admin'
      OR created_by = (SELECT auth.uid())
      OR (get_user_role((SELECT auth.uid())) = 'counselor' AND is_template = true)
      OR id IN (
        SELECT profile_id FROM public.profile_access
        WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
      )
    )
  )
);

-- ============================================================================
-- PART 2: Ensure UPDATE policy restricts counselors to own non-template profiles
-- ============================================================================

DROP POLICY IF EXISTS "Admins update all, counselors update own non-templates" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own, anyone update progress" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update their progress" ON public.profiles;

CREATE POLICY "Admins update all, counselors update own, counselees update accessible"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
  OR id IN (
    SELECT profile_id FROM public.profile_access
    WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
  OR id IN (
    SELECT profile_id FROM public.profile_access
    WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- PART 3: Ensure DELETE policy restricts counselors to own non-template profiles
-- ============================================================================

DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-template non-default" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-default" ON public.profiles;

CREATE POLICY "Admins delete all, counselors delete own non-template non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
);

-- ============================================================================
-- PART 4: Ensure INSERT policy exists (authenticated users create with created_by)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;

CREATE POLICY "Authenticated users can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- ============================================================================
-- PART 5: Ensure profile_access RLS (NO references to profiles - avoids recursion)
-- Profiles SELECT policy queries profile_access; profile_access must NOT query profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;

CREATE POLICY "Users can view access for their profiles"
ON public.profile_access
FOR SELECT
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid()))
  OR granted_by = (SELECT auth.uid())
);

CREATE POLICY "Counselors can grant access to their profiles"
ON public.profile_access
FOR INSERT
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR get_user_role((SELECT auth.uid())) = 'counselor'
);

CREATE POLICY "Counselors can revoke access to their profiles"
ON public.profile_access
FOR DELETE
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR granted_by = (SELECT auth.uid())
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'profile_access')
ORDER BY tablename, cmd, policyname;
