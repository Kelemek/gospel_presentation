-- Allow admins to view all user profiles
-- Run this in Supabase SQL Editor

-- Drop existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;

-- Consolidated SELECT policy: Users can view own OR admins can view all
CREATE POLICY "Users can view their own or admins view all"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR get_user_role((SELECT auth.uid())) = 'admin'
);

-- Allow admins to update user profiles (for role changes)
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.user_profiles;

CREATE POLICY "Admins can update all user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (get_user_role((SELECT auth.uid())) = 'admin')
WITH CHECK (get_user_role((SELECT auth.uid())) = 'admin');

-- Allow admins to delete user profiles
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;

CREATE POLICY "Admins can delete user profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (get_user_role((SELECT auth.uid())) = 'admin');

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
