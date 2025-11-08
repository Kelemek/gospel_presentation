-- Allow counselors to view all user profiles (for creating profiles for counselees)
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Counselors can view all user profiles" ON public.user_profiles;

-- Allow counselors to view all user profiles
CREATE POLICY "Counselors can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'counselor');

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
