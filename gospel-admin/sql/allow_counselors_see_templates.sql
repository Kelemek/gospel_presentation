-- Allow counselors to see all template profiles but only admins can edit them
-- This extends the existing RLS policy to include template access for counselors (read-only)

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Admins see all profiles, counselors see own and default" ON public.profiles;

-- Recreate SELECT policy with template access for counselors
CREATE POLICY "Admins see all profiles, counselors see own, default, and templates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR created_by = auth.uid()
  OR is_default = true
  OR (get_user_role(auth.uid()) = 'counselor' AND is_template = true)
);

-- Update UPDATE policy to ensure only admins can edit templates
DROP POLICY IF EXISTS "Admins update all, counselors update own" ON public.profiles;

CREATE POLICY "Admins update all, counselors update own non-templates"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false AND is_template = false)
)
WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false AND is_template = false)
);

-- Update DELETE policy to ensure only admins can delete templates
DROP POLICY IF EXISTS "Admins delete all, counselors delete own non-default" ON public.profiles;

CREATE POLICY "Admins delete all, counselors delete own non-template non-default"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin'
  OR (created_by = auth.uid() AND is_default = false AND is_template = false)
);

-- Verify the policies were updated
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

