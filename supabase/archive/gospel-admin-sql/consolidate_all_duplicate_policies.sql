-- Consolidated Fix for All Duplicate Permissive RLS Policies
-- Combines multiple permissive policies with OR conditions to improve performance
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Fix public.coma_templates duplicate SELECT policies
-- ============================================================================

-- Drop both duplicate policies
DROP POLICY IF EXISTS "Admins can manage COMA templates" ON public.coma_templates;
DROP POLICY IF EXISTS "Anyone can read COMA templates" ON public.coma_templates;

-- Create single consolidated SELECT policy (for all users, including anon)
CREATE POLICY "Anyone can read COMA templates"
  ON public.coma_templates
  FOR SELECT
  USING (true); -- Public can always read

-- Create admin-only INSERT policy
CREATE POLICY "Admins can insert COMA templates"
  ON public.coma_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- Create admin-only UPDATE policy
CREATE POLICY "Admins can update COMA templates"
  ON public.coma_templates
  FOR UPDATE
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

-- Create admin-only DELETE policy
CREATE POLICY "Admins can delete COMA templates"
  ON public.coma_templates
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
-- PART 2: Fix public.profiles duplicate SELECT policies
-- ============================================================================

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles - anyone sees all or counselor controls" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templates" ON public.profiles;
DROP POLICY IF EXISTS "Profile visibility with counselee access" ON public.profiles;
DROP POLICY IF EXISTS "View profiles" ON public.profiles;

-- Create consolidated SELECT policy for all users
CREATE POLICY "View profiles"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
  -- Anyone can view all profiles (for progress tracking/public access)
  true
);

-- ============================================================================
-- PART 3: Fix public.user_profiles duplicate SELECT policies
-- ============================================================================

-- Drop both duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own or admins view all" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- Create single consolidated SELECT policy
CREATE POLICY "Users can view their own or admins view all"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = (SELECT auth.uid())
  OR
  -- Admins can see all profiles
  get_user_role((SELECT auth.uid())) = 'admin'
);

-- ============================================================================
-- PART 4: Fix public.user_profiles duplicate UPDATE policies
-- ============================================================================

-- Drop all duplicate UPDATE policies
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Update user profiles" ON public.user_profiles;

-- Create single consolidated UPDATE policy
CREATE POLICY "Update user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  id = (SELECT auth.uid())
  OR
  -- Admins can update all profiles
  get_user_role((SELECT auth.uid())) = 'admin'
)
WITH CHECK (
  -- Users can update their own profile
  id = (SELECT auth.uid())
  OR
  -- Admins can update all profiles
  get_user_role((SELECT auth.uid())) = 'admin'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all duplicate policies have been consolidated
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('coma_templates', 'profiles', 'user_profiles')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
