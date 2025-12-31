-- Enable Row Level Security on admin_settings table
-- Run this in Supabase SQL Editor
-- 
-- The admin_settings table contains system-wide configuration and should only
-- be accessible to users with the admin role.

-- ============================================================================
-- PART 1: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Create RLS Policies
-- ============================================================================

-- SELECT: Allow public read access for verification code settings
-- This is needed by the login page (unauthenticated users) to:
-- 1. Know what code length to expect (4, 6, or 8 digits)
-- 2. Check if verification code login is enabled
-- 3. Display accurate expiry time to users
-- Note: These are non-sensitive configuration values
DROP POLICY IF EXISTS "Allow public read access to admin_settings" ON public.admin_settings;
CREATE POLICY "Allow public read access to admin_settings"
ON public.admin_settings
FOR SELECT
TO public
USING (true);

-- INSERT: Only admins can insert admin_settings (though table enforces single row)
DROP POLICY IF EXISTS "Only admins can insert admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can insert admin_settings"
ON public.admin_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- UPDATE: Only admins can update admin_settings
DROP POLICY IF EXISTS "Only admins can update admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can update admin_settings"
ON public.admin_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- DELETE: Only admins can delete admin_settings (though this should rarely if ever happen)
DROP POLICY IF EXISTS "Only admins can delete admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can delete admin_settings"
ON public.admin_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- ============================================================================
-- PART 3: Grant necessary permissions
-- ============================================================================

-- Grant permissions to service_role for migrations and system operations
GRANT ALL ON public.admin_settings TO service_role;

-- Authenticated users need SELECT to check policies, but RLS will restrict access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;

-- ============================================================================
-- PART 4: Verify RLS is enabled
-- ============================================================================

-- Verify RLS is enabled on admin_settings
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_settings') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'admin_settings';

-- List all policies on admin_settings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'admin_settings'
ORDER BY policyname;
