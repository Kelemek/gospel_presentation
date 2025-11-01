-- Add Counselee Role and Profile Access System
-- Run this in Supabase SQL Editor

-- IMPORTANT: Backup/Restore Consideration
-- Profile slugs are now random/secure instead of UUID-based to avoid conflicts
-- when restoring deleted profiles. The slug is separate from the UUID primary key,
-- so restored profiles maintain their original slug and profile_access records
-- can be preserved in backups.

-- Step 1: Add 'counselee' to user_role enum if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'counselee' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'counselee';
  END IF;
END $$;

-- Step 2: Create profile_access table for managing counselee access
-- NOTE: This table should be included in backups separately to preserve
-- access grants when profiles are restored
CREATE TABLE IF NOT EXISTS public.profile_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_role TEXT NOT NULL CHECK (access_role IN ('counselee', 'counselor')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, user_email)
);

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_access_profile_id ON public.profile_access(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_access_user_email ON public.profile_access(user_email);
CREATE INDEX IF NOT EXISTS idx_profile_access_user_id ON public.profile_access(user_id);

-- Step 4: Enable RLS on profile_access table
ALTER TABLE public.profile_access ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for profile_access table

-- Allow users to view access records for profiles they own or have access to
DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
CREATE POLICY "Users can view access for their profiles"
  ON public.profile_access
  FOR SELECT
  USING (
    -- Admins see everything
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors see access records for their own profiles
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_access.profile_id
      AND p.created_by = auth.uid()
    ) OR
    -- Counselees see their own access records
    (user_email = auth.email() OR user_id = auth.uid())
  );

-- Allow counselors and admins to grant access to their profiles
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
CREATE POLICY "Counselors can grant access to their profiles"
  ON public.profile_access
  FOR INSERT
  WITH CHECK (
    -- Admins can grant access to any profile
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors can grant access to profiles they own
    (
      get_user_role(auth.uid()) = 'counselor' AND
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_access.profile_id
        AND p.created_by = auth.uid()
      )
    )
  );

-- Allow counselors and admins to revoke access to their profiles
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;
CREATE POLICY "Counselors can revoke access to their profiles"
  ON public.profile_access
  FOR DELETE
  USING (
    -- Admins can revoke any access
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors can revoke access to profiles they own
    (
      get_user_role(auth.uid()) = 'counselor' AND
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_access.profile_id
        AND p.created_by = auth.uid()
      )
    )
  );

-- Step 6: Update profiles RLS to include counselee access

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;

-- New SELECT policy that includes counselee access
CREATE POLICY "Profile visibility with counselee access"
  ON public.profiles
  FOR SELECT
  USING (
    -- Public can view default profile
    is_default = true OR
    -- Admins can view all profiles
    get_user_role(auth.uid()) = 'admin' OR
    -- Counselors can view profiles they created
    created_by = auth.uid() OR
    -- Counselees can view profiles they have access to
    EXISTS (
      SELECT 1 FROM public.profile_access pa
      WHERE pa.profile_id = profiles.id
      AND (pa.user_email = auth.email() OR pa.user_id = auth.uid())
    )
  );

-- Step 7: Update the handle_new_user function to update profile_access
-- When a user signs up, link their user_id to any pending access records

CREATE OR REPLACE FUNCTION public.link_user_to_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any profile_access records that match this user's email
  UPDATE public.profile_access
  SET user_id = NEW.id
  WHERE user_email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to link users when they sign up
DROP TRIGGER IF EXISTS on_auth_user_created_link_access ON auth.users;
CREATE TRIGGER on_auth_user_created_link_access
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_to_profile_access();

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.profile_access TO authenticated;
GRANT ALL ON public.profile_access TO service_role;

-- Step 9: Verify the setup
SELECT 
  'profile_access table created' as status,
  COUNT(*) as record_count
FROM public.profile_access;
