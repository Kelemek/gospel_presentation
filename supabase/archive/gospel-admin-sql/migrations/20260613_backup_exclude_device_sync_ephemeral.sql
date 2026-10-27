-- Exclude ephemeral device-sync tables from automated backups.
-- pairing_sessions: 2-minute pairing codes (no updated_at; not restorable state).
-- sync_pairing_claim_rate_limits: per-IP claim counters (no updated_at; operational only).
-- sync_key_entries remains in backups (has updated_at; encrypted user sync payloads).

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
      'verification_codes',
      'profile_access',
      'pairing_sessions',
      'sync_pairing_claim_rate_limits'
    )
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION get_backup_tables() IS
  'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes, profile_access, and ephemeral device-sync tables (pairing_sessions, sync_pairing_claim_rate_limits). sync_key_entries is included.';
