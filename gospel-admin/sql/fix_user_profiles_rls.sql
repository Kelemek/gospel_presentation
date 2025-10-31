-- Fix user_profiles RLS so users can read their own role
-- Run this in Supabase SQL Editor

-- Drop and recreate policy to allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Fix the get_user_role function to work with RLS
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

-- Test the function now
SELECT get_user_role(auth.uid());

-- Also verify you can see your profile
SELECT * FROM public.user_profiles WHERE id = auth.uid();
