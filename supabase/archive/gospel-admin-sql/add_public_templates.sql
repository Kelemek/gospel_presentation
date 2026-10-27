-- Add is_public column to profiles for public template access
-- When is_template = true and is_public = true, anonymous users can view via Resources dropdown
-- Run this in Supabase SQL Editor

-- Add column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_public IS 'When true and is_template = true, anonymous users can view this profile via the Resources dropdown';

-- Update RLS: allow anonymous access to public templates
DROP POLICY IF EXISTS "Profile visibility with counselee and template access" ON public.profiles;

CREATE POLICY "Profile visibility with counselee and template access"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
  is_default = true
  OR (is_template = true AND is_public = true)
  OR (
    (SELECT auth.uid()) IS NOT NULL AND (
      get_user_role((SELECT auth.uid())) = 'admin'
      OR created_by = (SELECT auth.uid())
      OR (get_user_role((SELECT auth.uid())) = 'counselor' AND is_template = true)
      OR id IN (
        SELECT profile_id FROM public.profile_access
        WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
      )
    )
  )
);
