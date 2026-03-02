-- Allow counselees to update profiles they have access to (for saving form answers)
-- Run this in Supabase SQL Editor
-- Prerequisite: profile_access policies must NOT reference profiles (to avoid recursion)

DROP POLICY IF EXISTS "Admins update all, counselors update own non-templates" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all, counselors update own, counselees update accessible" ON public.profiles;

CREATE POLICY "Admins update all, counselors update own, counselees update accessible"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
  OR id IN (
    SELECT profile_id FROM public.profile_access
    WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (created_by = (SELECT auth.uid()) AND is_default = false AND is_template = false)
  OR id IN (
    SELECT profile_id FROM public.profile_access
    WHERE user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid())
  )
);
