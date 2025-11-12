-- Add preferred_translation column to user_profiles table
-- This allows users to choose between bible translations (ESV, NASB, etc.)
-- Default is 'esv' for backwards compatibility

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_translation VARCHAR(10) DEFAULT 'esv';

-- Drop the existing constraint if it exists and recreate with updated values
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS valid_translation;

-- Add a check constraint to ensure only valid translations
-- Update this list when adding new translations to the application
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_translation CHECK (preferred_translation IN ('esv', 'kjv', 'nasb'));

COMMENT ON COLUMN user_profiles.preferred_translation IS 'Preferred Bible translation for scripture lookups (esv, kjv, nasb, etc.)';
