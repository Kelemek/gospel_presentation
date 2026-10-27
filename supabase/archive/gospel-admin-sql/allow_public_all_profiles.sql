-- Allow public (anonymous) access to view ALL profiles
-- This is needed so that all gospel presentation profiles are accessible
-- Answers are stored in localStorage (client-side), not in the database
-- Run this in Supabase SQL Editor

-- Drop the restrictive policy that only allows default profile
DROP POLICY IF EXISTS "Anyone can view default profile" ON public.profiles;

-- Create new policy allowing anonymous users to view ALL profiles
CREATE POLICY "Anyone can view all profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: UPDATE policies are consolidated separately to avoid duplication:
-- - "Admins update all, counselors update own" handles role-based updates
-- - Anyone can update is already covered by the USING (true) in the consolidated policy
-- - To consolidate, use: DROP POLICY "Anyone can update their progress" 
--   and include the "update progress" logic in the main UPDATE policy

-- Verify the SELECT policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT'
ORDER BY policyname;
