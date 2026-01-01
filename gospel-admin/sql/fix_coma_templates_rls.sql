-- Allow everyone (including unauthenticated users) to read COMA templates
-- This is safe because the templates are instructional content that should be publicly accessible

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read COMA templates" ON public.coma_templates;
DROP POLICY IF EXISTS "Admins can manage COMA templates" ON public.coma_templates;

-- Create single consolidated policy for reads (SELECT for all)
CREATE POLICY "Anyone can read COMA templates"
  ON public.coma_templates
  FOR SELECT
  USING (true);

-- Create admin-only policy for writes (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage COMA templates"
  ON public.coma_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );
