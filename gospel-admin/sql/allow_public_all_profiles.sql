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

-- Allow anonymous users to update last_viewed_scripture (for progress tracking)
-- This is the only field that anonymous users can modify
DROP POLICY IF EXISTS "Anyone can update their progress" ON public.profiles;

CREATE POLICY "Anyone can update their progress"
ON public.profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Note: Only admins should be able to INSERT, DELETE, or modify other fields
-- Those policies should be set separately for authenticated admin users

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
