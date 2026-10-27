-- Remove the old "Anyone can view all profiles" policy that conflicts with counselee access control
-- Run this in Supabase SQL Editor

-- Drop the problematic policy that allows everyone to see everything
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;

-- Also drop the old authenticated-only policy if it exists
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own, default, and templ" ON public.profiles;

-- Verify only the correct SELECT policy remains
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- The only SELECT policy should be:
-- "Profile visibility with counselee access" which properly restricts access based on role
