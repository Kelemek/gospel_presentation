-- Fix RLS policies to allow admins to see all profiles
-- Run this in Supabase SQL Editor

-- Drop ALL existing RLS policies on profiles
DROP POLICY IF EXISTS "Users can view their own profiles and default" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-default" ON public.profiles;

-- Drop and recreate helper function to get user role
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  SELECT role::TEXT INTO user_role 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;

-- SELECT: Admins see all, counselors see only their own + default
CREATE POLICY "Admins see all profiles, counselors see own and default"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR created_by = auth.uid()
  OR is_default = true
);

-- INSERT: All authenticated users can create profiles
CREATE POLICY "Authenticated users can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- UPDATE: Admins can update all, counselors can update only their own (not default)
CREATE POLICY "Admins update all, counselors update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false)
)
WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false)
);

-- DELETE: Admins can delete all, counselors can delete only their own (not default)
CREATE POLICY "Admins delete all, counselors delete own non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false)
);

-- Verify policies were created
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
