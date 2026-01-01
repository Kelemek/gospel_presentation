-- Fix profile_access RLS policies to be less restrictive
-- Delegate profile ownership checks to application layer
-- Run this in Supabase SQL Editor

-- ============================================================================
-- Drop all existing profile_access policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;

-- ============================================================================
-- Recreate simplified policies
-- ============================================================================

-- SELECT: Users can view access records for profiles they own or have access to
CREATE POLICY "Users can view access for their profiles"
  ON public.profile_access
  FOR SELECT
  USING (
    -- Admins see everything
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Users see their own access records (by email or user_id)
    user_email = (SELECT auth.email()) OR 
    user_id = (SELECT auth.uid()) OR
    -- Counselors see access records they granted
    granted_by = (SELECT auth.uid())
  );

-- INSERT: Counselors and admins can grant access
-- Profile ownership is checked in the application layer
CREATE POLICY "Counselors can grant access to their profiles"
  ON public.profile_access
  FOR INSERT
  WITH CHECK (
    -- Admins can grant access to any profile
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors can grant access (profile ownership checked in application layer)
    get_user_role((SELECT auth.uid())) = 'counselor'
  );

-- DELETE: Counselors and admins can revoke access
CREATE POLICY "Counselors can revoke access to their profiles"
  ON public.profile_access
  FOR DELETE
  USING (
    -- Admins can revoke any access
    get_user_role((SELECT auth.uid())) = 'admin' OR
    -- Counselors can revoke access they granted
    granted_by = (SELECT auth.uid())
  );

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL THEN 'HAS_QUAL' ELSE 'NO_QUAL' END as qualification
FROM pg_policies
WHERE tablename = 'profile_access'
ORDER BY policyname, cmd;
