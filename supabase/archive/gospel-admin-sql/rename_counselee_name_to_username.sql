-- Migration: Rename counselee_name column to username
-- This migration renames the counselee_name column to username in the user_profiles table
-- since not all users are counselees

BEGIN;

-- Rename the column
ALTER TABLE user_profiles RENAME COLUMN counselee_name TO username;

-- Rename the index if it exists
ALTER INDEX IF EXISTS idx_user_profiles_counselee_name RENAME TO idx_user_profiles_username;

COMMIT;
