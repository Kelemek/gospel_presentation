-- Fix 20260507 typo: table is `scripture_access_logs` (plural), not `scripture_access_log`.
-- Re-exclude `verification_codes` (ephemeral auth) from heavy Edge backups.
CREATE OR REPLACE FUNCTION get_backup_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.tablename::text AS table_name
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename NOT IN (
      'supabase_migrations',
      'schema_migrations',
      'scripture_cache',
      'scripture_access_log',
      'scripture_access_logs',
      'session_audit_log',
      'backup_runs',
      'bible_verses',
      'verification_codes'
    )
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION get_backup_tables() IS
  'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes; re-seed scriptures with import scripts if needed.';
