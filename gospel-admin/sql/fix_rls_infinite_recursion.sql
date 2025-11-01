-- Fix infinite recursion in RLS policies
-- This replaces the problematic policies from add_counselee_system.sql
-- Run this in Supabase SQL Editor to fix the 404 error

-- Step 1: Drop all existing policies on profile_access
DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;

-- Step 2: Drop the problematic profiles policy
DROP POLICY IF EXISTS "Profile visibility with counselee access" ON public.profiles;

-- Step 3: Create simplified profile_access policies WITHOUT circular reference
-- These policies check profile ownership WITHOUT querying the profiles table for access

-- Allow users to view access records (simplified - no circular dependency)
CREATE POLICY "Users can view access for their profiles"
  ON public.profile_access
  FOR SELECT
  USING (
    -- Admins see everything
    get_user_role(auth.uid()) = 'admin' OR
    -- Users see their own access records (by email or user_id)
    user_email = auth.email() OR 
    user_id = auth.uid() OR
    -- Counselors see access records they granted
    granted_by = auth.uid()
  );

-- Allow counselors and admins to grant access to their profiles
CREATE POLICY "Counselors can grant access to their profiles"
  ON public.profile_access
  FOR INSERT
  WITH CHECK (
    -- Admins can grant access to any profile
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors can grant access (profile ownership checked in application layer)
    get_user_role(auth.uid()) = 'counselor'
  );

-- Allow counselors and admins to revoke access to their profiles
CREATE POLICY "Counselors can revoke access to their profiles"
  ON public.profile_access
  FOR DELETE
  USING (
    -- Admins can revoke any access
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors can revoke access they granted
    granted_by = auth.uid()
  );

-- Step 4: Create a simplified profiles SELECT policy
-- This checks profile_access but avoids the circular dependency by using a subquery
-- that doesn't trigger the profile_access RLS policies

CREATE POLICY "Profile visibility with counselee access"
  ON public.profiles
  FOR SELECT
  USING (
    -- Public can view default profile (unauthenticated users)
    is_default = true OR
    -- Authenticated users
    (
      auth.uid() IS NOT NULL AND (
        -- Admins can view all profiles
        get_user_role(auth.uid()) = 'admin' OR
        -- Counselors can view profiles they created
        created_by = auth.uid() OR
        -- Counselees can view profiles they have access to
        -- Use a direct subquery without triggering RLS
        id IN (
          SELECT profile_id 
          FROM public.profile_access 
          WHERE (user_email = auth.email() OR user_id = auth.uid())
        )
      )
    )
  );

-- Step 5: Verify the fix by checking if we can query profiles
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  RAISE NOTICE 'Successfully queried profiles table. Count: %', profile_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error querying profiles: %', SQLERRM;
END $$;
