-- Fix infinite recursion in profiles RLS
-- profiles SELECT queries profile_access; profile_access must NOT query profiles
-- Run this in Supabase SQL Editor if you see "infinite recursion detected in policy for relation profiles"

DROP POLICY IF EXISTS "Users can view access for their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can grant access to their profiles" ON public.profile_access;
DROP POLICY IF EXISTS "Counselors can revoke access to their profiles" ON public.profile_access;

CREATE POLICY "Users can view access for their profiles"
ON public.profile_access
FOR SELECT
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR (user_email = (SELECT auth.email()) OR user_id = (SELECT auth.uid()))
  OR granted_by = (SELECT auth.uid())
);

CREATE POLICY "Counselors can grant access to their profiles"
ON public.profile_access
FOR INSERT
WITH CHECK (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR get_user_role((SELECT auth.uid())) = 'counselor'
);

CREATE POLICY "Counselors can revoke access to their profiles"
ON public.profile_access
FOR DELETE
USING (
  get_user_role((SELECT auth.uid())) = 'admin'
  OR granted_by = (SELECT auth.uid())
);
