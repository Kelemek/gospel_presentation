-- Allow public (anonymous) access to view the default profile
-- Run this in Supabase SQL Editor

-- Add policy for anonymous users to view default profile
DROP POLICY IF EXISTS "Anyone can view default profile" ON public.profiles;

CREATE POLICY "Anyone can view default profile"
ON public.profiles
FOR SELECT
TO anon
USING (is_default = true);

-- Verify the policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
