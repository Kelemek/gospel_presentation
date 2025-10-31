-- Allow admins to view all user profiles
-- Run this in Supabase SQL Editor

-- Drop existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;

-- Allow users to view their own profile (needed for get_user_role function)
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Allow admins to update user profiles (for role changes)
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.user_profiles;

CREATE POLICY "Admins can update all user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Allow admins to delete user profiles
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;

CREATE POLICY "Admins can delete user profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

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
