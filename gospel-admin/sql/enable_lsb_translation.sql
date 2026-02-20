-- Add LSB (Legacy Standard Bible) to translation_settings and enable it
-- Run after importing LSB verses with: node scripts/import-lsb-bible.js

INSERT INTO translation_settings (translation_code, translation_name, is_enabled, display_order)
VALUES ('lsb', 'LSB (Legacy Standard Bible)', true, 4)
ON CONFLICT (translation_code) DO UPDATE SET
  translation_name = EXCLUDED.translation_name,
  is_enabled = EXCLUDED.is_enabled,
  display_order = EXCLUDED.display_order;

-- Update user_profiles preferred_translation constraint to allow 'lsb'
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS valid_translation;

ALTER TABLE user_profiles
ADD CONSTRAINT valid_translation CHECK (preferred_translation IN ('esv', 'kjv', 'nasb', 'lsb'));

-- Verify the change
SELECT translation_code, translation_name, is_enabled, display_order
FROM translation_settings
ORDER BY display_order;
