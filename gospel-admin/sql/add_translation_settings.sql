-- Create translation_settings table to control site-wide translation availability
-- Only admins can modify these settings

CREATE TABLE IF NOT EXISTS translation_settings (
  translation_code VARCHAR(10) PRIMARY KEY,
  translation_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default translations
INSERT INTO translation_settings (translation_code, translation_name, is_enabled, display_order)
VALUES 
  ('esv', 'ESV (English Standard Version)', true, 1),
  ('kjv', 'KJV (King James Version)', true, 2),
  ('nasb', 'NASB (New American Standard Bible 1995)', true, 3)
ON CONFLICT (translation_code) DO NOTHING;

-- Add RLS policies
ALTER TABLE translation_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read translation settings
CREATE POLICY "Anyone can view translation settings"
  ON translation_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can update translation settings
CREATE POLICY "Only admins can update translation settings"
  ON translation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE translation_settings IS 'Controls which Bible translations are available site-wide';
COMMENT ON COLUMN translation_settings.translation_code IS 'Short code for the translation (esv, kjv, nasb, etc.)';
COMMENT ON COLUMN translation_settings.translation_name IS 'Display name for the translation';
COMMENT ON COLUMN translation_settings.is_enabled IS 'Whether this translation is currently available';
COMMENT ON COLUMN translation_settings.display_order IS 'Order in which translations appear in dropdown';
