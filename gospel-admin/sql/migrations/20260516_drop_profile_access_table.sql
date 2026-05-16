-- Remove legacy profile_access (counselee assignment) table and auth trigger.
-- App is admin-only staff; assignments are not used (see 20260514 migration for RLS cleanup).
--
-- Run after deploying code that no longer references profile_access.

-- Stop automated backups from selecting profile_access (matches Edge fallback list).
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
      'profile_access'
    )
  ORDER BY t.tablename;
$$;

COMMENT ON FUNCTION get_backup_tables() IS
  'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes, profile_access; re-seed scriptures with import scripts if needed.';

-- Link pending invites to auth users (legacy)
DROP TRIGGER IF EXISTS on_auth_user_created_link_access ON auth.users;

DROP FUNCTION IF EXISTS public.link_user_to_profile_access();

DROP TABLE IF EXISTS public.profile_access CASCADE;
