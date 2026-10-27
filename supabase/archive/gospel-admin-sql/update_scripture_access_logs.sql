-- Update scripture_access_logs table to remove translation constraint and unnecessary columns
-- This allows any translation to be added without modifying the database schema
-- And simplifies the table to only track: scripture_reference, translation, session_id, timestamp

-- Drop the existing constraint
ALTER TABLE scripture_access_logs 
DROP CONSTRAINT IF EXISTS scripture_access_logs_translation_check;

-- Drop unnecessary columns (if they exist from previous schema)
ALTER TABLE scripture_access_logs
DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE scripture_access_logs
DROP COLUMN IF EXISTS profile_slug CASCADE;

ALTER TABLE scripture_access_logs
DROP COLUMN IF EXISTS ip_address CASCADE;

ALTER TABLE scripture_access_logs
DROP COLUMN IF EXISTS user_agent CASCADE;

-- Drop old indices that referenced removed columns
DROP INDEX IF EXISTS idx_scripture_access_user CASCADE;
DROP INDEX IF EXISTS idx_scripture_access_profile CASCADE;
