-- Migration: Safe truncate for restore operations
-- Run in Supabase SQL Editor. Used by restore-backup.js to clear tables before restore.

CREATE OR REPLACE FUNCTION truncate_backup_table(tname text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tname NOT IN (
    'admin_settings', 'bible_verses', 'coma_templates', 'profile_access',
    'profiles', 'translation_settings', 'user_profiles'
  ) THEN
    RAISE EXCEPTION 'Table % is not allowed for truncate', tname;
  END IF;
  EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', tname);
END;
$$;

COMMENT ON FUNCTION truncate_backup_table(text) IS 'Truncates a table for restore. Used by restore-backup.js. Whitelist tables in the restore script.';
