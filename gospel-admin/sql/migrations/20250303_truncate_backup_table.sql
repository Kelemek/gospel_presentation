-- Migration: Safe truncate helper (optional manual DBA / one-off use)
-- Whitelist matches tables that were historically restored from JSON exports.

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

COMMENT ON FUNCTION truncate_backup_table(text) IS 'SECURITY DEFINER truncate for whitelisted public tables only. No in-repo CLI uses this; optional manual recovery.';
