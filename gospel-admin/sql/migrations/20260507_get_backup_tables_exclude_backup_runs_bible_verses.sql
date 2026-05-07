-- Exclude backup_run metadata and scripture cache duplication from automated exports.
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
      'session_audit_log',
      'backup_runs',
      'bible_verses'
    )
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION get_backup_tables() IS
  'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture/scripture_access/session cache and log tables, backup_runs (backup metadata), and bible_verses (large translation cache; re-import from scripts if needed).';
