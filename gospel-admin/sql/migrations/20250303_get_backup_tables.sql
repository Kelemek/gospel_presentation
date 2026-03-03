-- Migration: Function to discover tables for backup (excludes large/cache/ephemeral tables)
-- Run in Supabase SQL Editor. Used by the backup GitHub Action.

CREATE OR REPLACE FUNCTION get_backup_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    -- Exclude: large static data, cache, logs, ephemeral
    AND t.table_name NOT IN (
      'bible_verses',           -- 93K+ rows, re-importable from source
      'scripture_cache',        -- cache, regenerable
      'scripture_access_logs',  -- audit logs
      'verification_codes'     -- ephemeral, cleaned up by cron
    )
  ORDER BY t.table_name;
$$;

COMMENT ON FUNCTION get_backup_tables() IS 'Returns list of public tables to include in automated backups. Excludes large/cache/ephemeral tables.';
