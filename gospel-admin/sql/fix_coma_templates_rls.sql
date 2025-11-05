-- Allow everyone (including unauthenticated users) to read COMA templates
-- This is safe because the templates are instructional content that should be publicly accessible

-- Drop the existing restrictive policy if it exists
DROP POLICY IF EXISTS "Admins can manage COMA templates" ON coma_templates;

-- Create separate policies for read and write access

-- Policy: Everyone can read COMA templates (including unauthenticated users)
CREATE POLICY "Anyone can read COMA templates"
  ON coma_templates
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert, update, or delete COMA templates
CREATE POLICY "Admins can manage COMA templates"
  ON coma_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
