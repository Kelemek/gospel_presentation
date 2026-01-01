-- Comprehensive RLS Policy Performance Optimization
-- Fixes all auth.uid() and auth.email() calls to use (SELECT auth.uid()) / (SELECT auth.email())
-- This prevents unnecessary per-row re-evaluation and improves query performance at scale
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Fix admin_settings RLS Policies
-- ============================================================================

-- INSERT: Only admins can insert admin_settings
DROP POLICY IF EXISTS "Only admins can insert admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can insert admin_settings"
ON public.admin_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
    AND user_profiles.role = 'admin'
  )
);

-- UPDATE: Only admins can update admin_settings
DROP POLICY IF EXISTS "Only admins can update admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can update admin_settings"
ON public.admin_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
    AND user_profiles.role = 'admin'
  )
);

-- DELETE: Only admins can delete admin_settings
DROP POLICY IF EXISTS "Only admins can delete admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can delete admin_settings"
ON public.admin_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
    AND user_profiles.role = 'admin'
  )
);

-- ============================================================================
-- PART 2: Fix coma_templates RLS Policies
-- ============================================================================

-- Policy: Only admins can insert, update, or delete COMA templates
DROP POLICY IF EXISTS "Admins can manage COMA templates" ON public.coma_templates;
CREATE POLICY "Admins can manage COMA templates"
  ON public.coma_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 3: Fix user_profiles RLS Policies
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- Admins can view all user profiles
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (get_user_role((SELECT auth.uid())) = 'admin');

-- Admins can update all user profiles
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (get_user_role((SELECT auth.uid())) = 'admin')
WITH CHECK (get_user_role((SELECT auth.uid())) = 'admin');

-- Admins can delete user profiles
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete user profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (get_user_role((SELECT auth.uid())) = 'admin');

-- Users can update own profile (view preference)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- PART 4: Fix translation_settings RLS Policy
-- ============================================================================

-- Only admins can update translation settings
DROP POLICY IF EXISTS "Only admins can update translation settings" ON public.translation_settings;
CREATE POLICY "Only admins can update translation settings"
  ON public.translation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- PART 5: Fix scripture_access_logs RLS Policy
-- ============================================================================

-- Only admins can view scripture logs
DROP POLICY IF EXISTS "Only admins can view scripture logs" ON public.scripture_access_logs;
CREATE POLICY "Only admins can view scripture logs"
ON public.scripture_access_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
    AND user_profiles.role = 'admin'
  )
);

-- ============================================================================
-- PART 6: Fix profiles RLS Policies
-- ============================================================================

-- SELECT: Admins see all, counselors see only their own + default
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;
CREATE POLICY "Admins see all profiles, counselors see own and default"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR created_by = (SELECT auth.uid())
  OR is_default = true
);

-- INSERT: All authenticated users can create profiles
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;
CREATE POLICY "Authenticated users can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
);

-- UPDATE: Admins can update all, counselors can update only their own (not default)
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;
CREATE POLICY "Admins update all, counselors update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
)
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
);

-- DELETE: Admins can delete all, counselors can delete only their own (not default)
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-default" ON public.profiles;
CREATE POLICY "Admins delete all, counselors delete own non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
);

-- ============================================================================
-- PART 7: Fix profiles Policies with Template Support
-- ============================================================================

-- DROP and recreate SELECT policy with template access for counselors
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templates" ON public.profiles;
CREATE POLICY "Admins see all profiles, counselors see own, default, and templates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR created_by = (SELECT auth.uid())
  OR is_default = true
  OR (get_user_role((SELECT auth.uid())) = 'counselor' AND is_template = true)
);

-- UPDATE: Only admins can edit templates, counselors update own non-templates
DROP POLICY IF EXISTS "Admins update all, counselors update own non-templates" ON public.profiles;
CREATE POLICY "Admins update all, counselors update own non-templates"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
)
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
);

-- DELETE: Only admins can delete templates
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-template non-default" ON public.profiles;
CREATE POLICY "Admins delete all, counselors delete own non-template non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
);

-- ============================================================================
-- PART 8: Fix profile_access RLS Policies
-- ============================================================================

-- SELECT: Users can view access records for profiles they own or have access to
DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
CREATE POLICY "Users can view access for their profiles"
  ON public.profile_access
  FOR SELECT
  USING (
    -- Admins see everything
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors see access records for their own profiles
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_access.profile_id
      AND p.created_by = (SELECT auth.uid())
    ) OR
    -- Counselees see their own access records
    (user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid()))
  );

-- INSERT: Counselors and admins can grant access
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
CREATE POLICY "Counselors can grant access to their profiles"
  ON public.profile_access
  FOR INSERT
  WITH CHECK (
    -- Admins can grant access to any profile
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors can grant access to profiles they own
    (
      get_user_role((SELECT auth.uid())) = 'counselor' AND
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_access.profile_id
        AND p.created_by = (SELECT auth.uid())
      )
    )
  );

-- DELETE: Counselors and admins can revoke access
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;
CREATE POLICY "Counselors can revoke access to their profiles"
  ON public.profile_access
  FOR DELETE
  USING (
    -- Admins can revoke any access
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors can revoke access to profiles they own
    (
      get_user_role((SELECT auth.uid())) = 'counselor' AND
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_access.profile_id
        AND p.created_by = (SELECT auth.uid())
      )
    )
  );

-- ============================================================================
-- PART 9: Fix profiles Policy with Counselee Access
-- ============================================================================

-- SELECT: Profile visibility with counselee access
DROP POLICY IF EXISTS "Profile visibility with counselee access" ON public.profiles;
CREATE POLICY "Profile visibility with counselee access"
  ON public.profiles
  FOR SELECT
  USING (
    -- Public can view default profile
    is_default = true OR
    -- Admins can view all profiles
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors can view profiles they created
    created_by = (SELECT auth.uid()) OR
    -- Counselees can view profiles they have access to
    EXISTS (
      SELECT 1 FROM public.profile_access pa
      WHERE pa.profile_id = profiles.id
      AND (pa.user_email = (SELECT auth.email()) OR pa.user_id = (SELECT auth.uid()))
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all policies have been updated
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('admin_settings', 'coma_templates', 'user_profiles', 'translation_settings', 'scripture_access_logs', 'profiles', 'profile_access')
GROUP BY tablename
ORDER BY tablename;
