-- Consolidate Duplicate Permissive RLS Policies
-- Combines multiple permissive policies with OR conditions to improve performance
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Fix public.coma_templates duplicate SELECT policies
-- ============================================================================

-- Drop both existing SELECT-related policies
DROP POLICY IF EXISTS "Anyone can read COMA templates" ON public.coma_templates;
DROP POLICY IF EXISTS "Admins can manage COMA templates" ON public.coma_templates;

-- Recreate as single consolidated SELECT policy
CREATE POLICY "Anyone can read COMA templates"
  ON public.coma_templates
  FOR SELECT
  USING (true); -- Public can always read

-- Recreate the admin-only write policy (INSERT, UPDATE, DELETE via FOR ALL)
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
-- PART 2: Fix public.profiles duplicate UPDATE policies
-- ============================================================================

-- Drop both UPDATE policies
DROP POLICY IF EXISTS "Anyone can update their progress" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;

-- Consolidate into single UPDATE policy
CREATE POLICY "Admins update all, counselors update own, anyone update progress"
ON public.profiles
FOR UPDATE
USING (
  -- Anyone can update their progress
  true
)
WITH CHECK (
  -- Admins can update all, counselors can update own (not default)
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
  -- OR anyone can update (for progress tracking)
  OR true
);

-- Simpler approach: Use a single, more permissive policy
DROP POLICY IF EXISTS "Admins update all, counselors update own, anyone update progress" ON public.profiles;
CREATE POLICY "Update profiles"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (
  -- Admins can update all
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false)
  -- OR anyone can update (for progress like last_viewed)
  OR true
);

-- ============================================================================
-- PART 3: Fix public.user_profiles duplicate SELECT policies
-- ============================================================================

-- Drop the old "user_profiles_select_own" policy if it exists
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

-- Create single consolidated SELECT policy
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = (SELECT auth.uid())
  -- Admins can see all profiles
  OR get_user_role((SELECT auth.uid())) = 'admin'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify consolidated policies
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
