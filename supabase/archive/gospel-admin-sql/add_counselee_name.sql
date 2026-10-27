-- Add counselee_name column to user_profiles table
-- This stores the actual name for counselees (separate from email in display_name)

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS counselee_name TEXT;

COMMENT ON COLUMN user_profiles.counselee_name IS 'Display name for counselees (can be different from email)';

-- Backfill existing users: use display_name as counselee_name for those who don't have one
UPDATE user_profiles 
SET counselee_name = display_name 
WHERE counselee_name IS NULL AND display_name IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_counselee_name ON user_profiles(counselee_name);
