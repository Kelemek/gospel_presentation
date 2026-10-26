-- =============================================================================
-- Baseline public schema for Gospel Presentation (mchtyihbwlzjhkcmdvib)
-- Reconstructed via Supabase MCP (describe_tables + execute_sql), NOT pg_dump.
-- Represents CURRENT live schema (post 20260303* and 20260928190044).
--
-- Idempotent (CREATE IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS) so that:
--   - On production: mark applied via `supabase migration repair 20261026180000 --status applied`
--     (do not re-run; schema already exists).
--   - On preview branches cloned from prod: safe no-op if somehow executed.
--   - Local `supabase db reset` still needs the three history migrations to succeed;
--     those UPDATE/ALTER content migrations assume tables exist. Prefer branching
--     from prod or apply this baseline in a bootstrap path for empty DBs.
-- =============================================================================

-- Extensions used by defaults / functions (Supabase typically has these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
-- pg_net is used by run_backup_to_storage*_job; may already exist — ignore if present
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_net";
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'counselor', 'counselee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  visit_count integer DEFAULT 0,
  gospel_data jsonb NOT NULL,
  last_viewed_scripture jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_visited timestamptz,
  created_by uuid,
  is_template boolean DEFAULT false,
  saved_answers jsonb DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT false,
  include_in_resources_menu boolean NOT NULL DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_slug_key UNIQUE (slug),
  CONSTRAINT slug_length CHECK (length(slug) >= 3 AND length(slug) <= 20),
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+$'::text)
);

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  role public.user_role NOT NULL DEFAULT 'counselor'::public.user_role,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  preferred_translation character varying(10) DEFAULT 'esv'::character varying,
  view_preference character varying(10) DEFAULT 'list'::character varying,
  username text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT valid_translation CHECK (preferred_translation::text = ANY (ARRAY['esv'::character varying, 'kjv'::character varying, 'nasb'::character varying, 'lsb'::character varying, 'niv'::character varying, 'nlt'::character varying, 'csb'::character varying]::text[]))
);

DO $$ BEGIN
  ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.coma_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default COMA Template'::text,
  questions jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  instructions text,
  CONSTRAINT coma_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.translation_settings (
  translation_code character varying(10) NOT NULL,
  translation_name character varying(100) NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT translation_settings_pkey PRIMARY KEY (translation_code)
);

CREATE TABLE IF NOT EXISTS public.scripture_cache (
  reference text NOT NULL,
  translation text NOT NULL,
  text text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  woc_text text,
  CONSTRAINT scripture_cache_pkey PRIMARY KEY (reference, translation)
);

CREATE SEQUENCE IF NOT EXISTS public.scripture_access_logs_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS public.scripture_access_logs (
  id bigint NOT NULL DEFAULT nextval('public.scripture_access_logs_id_seq'::regclass),
  scripture_reference text NOT NULL,
  translation text NOT NULL,
  session_id text NOT NULL,
  "timestamp" timestamp without time zone DEFAULT now(),
  year_accessed integer GENERATED ALWAYS AS (EXTRACT(year FROM "timestamp")) STORED,
  CONSTRAINT scripture_access_logs_pkey PRIMARY KEY (id)
);

DO $$ BEGIN
  ALTER SEQUENCE public.scripture_access_logs_id_seq OWNED BY public.scripture_access_logs.id;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  verification_code_length integer DEFAULT 6,
  verification_code_expiry_minutes integer DEFAULT 15,
  enable_verification_code_login boolean DEFAULT false,
  public_template_order jsonb DEFAULT '[]'::jsonb,
  secular_term_map jsonb,
  notion_feedback_enabled boolean NOT NULL DEFAULT false,
  notion_token text,
  notion_database_id text DEFAULT ''::text,
  CONSTRAINT admin_settings_pkey PRIMARY KEY (id),
  CONSTRAINT single_row CHECK (id = 1),
  CONSTRAINT admin_settings_verification_code_length_check CHECK (verification_code_length = ANY (ARRAY[4, 6, 8])),
  CONSTRAINT admin_settings_verification_code_expiry_minutes_check CHECK (verification_code_expiry_minutes >= 5 AND verification_code_expiry_minutes <= 60)
);

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  action_type text NOT NULL,
  action_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id),
  CONSTRAINT verification_codes_action_type_check CHECK (action_type = ANY (ARRAY['user_login'::text, 'admin_login'::text, 'counselor_login'::text, 'password_reset'::text, 'email_verification'::text])),
  CONSTRAINT verification_codes_email_lower_check CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS public.spurgeon_passage_index (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  passage_key text NOT NULL,
  profile_id uuid NOT NULL,
  sermon_no integer,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spurgeon_passage_index_pkey PRIMARY KEY (id),
  CONSTRAINT spurgeon_passage_index_passage_key_profile_id_key UNIQUE (passage_key, profile_id)
);

DO $$ BEGIN
  ALTER TABLE public.spurgeon_passage_index
    ADD CONSTRAINT spurgeon_passage_index_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_started_at timestamptz NOT NULL DEFAULT now(),
  run_completed_at timestamptz,
  status text NOT NULL,
  backup_path text,
  backup_bytes bigint,
  table_count integer,
  row_count_total bigint,
  table_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  table_hash text,
  new_tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  admin_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  backup_kind text NOT NULL DEFAULT 'full'::text,
  incremental_base_completed_at timestamptz,
  CONSTRAINT backup_runs_pkey PRIMARY KEY (id),
  CONSTRAINT backup_runs_status_check CHECK (status = ANY (ARRAY['running'::text, 'partial'::text, 'success'::text, 'warning'::text, 'failed'::text])),
  CONSTRAINT backup_runs_backup_kind_check CHECK (backup_kind = ANY (ARRAY['full'::text, 'differential'::text]))
);

CREATE TABLE IF NOT EXISTS public.pairing_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  storage_id text NOT NULL,
  encrypted_sync_key text,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pairing_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sync_key_entries (
  storage_id text NOT NULL,
  storage_key text NOT NULL,
  ciphertext text NOT NULL DEFAULT ''::text,
  content_hash text NOT NULL DEFAULT ''::text,
  updated_at timestamptz NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT sync_key_entries_pkey PRIMARY KEY (storage_id, storage_key)
);

CREATE TABLE IF NOT EXISTS public.sync_pairing_claim_rate_limits (
  client_ip text NOT NULL,
  window_start timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  CONSTRAINT sync_pairing_claim_rate_limits_pkey PRIMARY KEY (client_ip)
);

-- ---------------------------------------------------------------------------
-- Indexes (excluding primary-key indexes)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS backup_runs_created_at_idx ON public.backup_runs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS backup_runs_status_idx ON public.backup_runs USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS pairing_sessions_code_unique ON public.pairing_sessions USING btree (code);
CREATE INDEX IF NOT EXISTS pairing_sessions_expires_at_idx ON public.pairing_sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_include_in_resources_menu ON public.profiles USING btree (include_in_resources_menu) WHERE (include_in_resources_menu = false);
CREATE INDEX IF NOT EXISTS idx_profiles_saved_answers ON public.profiles USING gin (saved_answers);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_scripture_access_session ON public.scripture_access_logs USING btree (session_id, translation);
CREATE INDEX IF NOT EXISTS idx_scripture_access_translation_year ON public.scripture_access_logs USING btree (translation, year_accessed);
CREATE INDEX IF NOT EXISTS idx_scripture_cache_cached_at ON public.scripture_cache USING btree (cached_at);
CREATE INDEX IF NOT EXISTS idx_spurgeon_passage_index_passage_key ON public.spurgeon_passage_index USING btree (passage_key);
CREATE INDEX IF NOT EXISTS idx_spurgeon_passage_index_profile_id ON public.spurgeon_passage_index USING btree (profile_id);
CREATE INDEX IF NOT EXISTS sync_key_entries_storage_updated_idx ON public.sync_key_entries USING btree (storage_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles USING btree (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_view_preference ON public.user_profiles USING btree (id, view_preference);
CREATE INDEX IF NOT EXISTS idx_verification_codes_action_type ON public.verification_codes USING btree (action_type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.verification_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes USING btree (email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_used_at ON public.verification_codes USING btree (used_at) WHERE (used_at IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Functions (app-owned public schema)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  SELECT role::TEXT INTO user_role 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN user_role;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'counselor', -- Default role, admin must be set manually
    NEW.email -- Use email as display_name initially
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_visit_count(profile_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET
    visit_count = visit_count + 1,
    last_visited = NOW()
  WHERE slug = profile_slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_translation(user_id uuid, new_translation character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE user_profiles 
  SET preferred_translation = new_translation 
  WHERE id = user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cached_scripture(p_reference text, p_translation text, p_ttl_days integer DEFAULT 30)
 RETURNS TABLE(text text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT sc.text
  FROM scripture_cache sc
  WHERE sc.reference = p_reference
    AND sc.translation = p_translation
    AND sc.cached_at >= NOW() - (p_ttl_days || ' days')::INTERVAL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_scripture_cache(p_reference text, p_translation text, p_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO scripture_cache (reference, translation, text, cached_at)
  VALUES (p_reference, p_translation, p_text, NOW())
  ON CONFLICT (reference, translation)
  DO UPDATE SET
    text = EXCLUDED.text,
    cached_at = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_esv_cache_limit(p_max_verses integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  excess_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count current ESV cache entries
  SELECT COUNT(*) INTO current_count
  FROM scripture_cache
  WHERE translation = 'esv';
  
  -- If under limit, no action needed
  IF current_count <= p_max_verses THEN
    RETURN 0;
  END IF;
  
  -- Calculate how many entries to delete
  excess_count := current_count - p_max_verses;
  
  -- Delete oldest (least recently used) entries
  DELETE FROM scripture_cache
  WHERE translation = 'esv'
    AND reference IN (
      SELECT reference
      FROM scripture_cache
      WHERE translation = 'esv'
      ORDER BY cached_at ASC
      LIMIT excess_count
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_esv_cache_limit(p_current_total_verses integer DEFAULT NULL::integer, p_max_verses integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
  current_total INTEGER;
  ref_to_delete TEXT;
BEGIN
  -- Use provided verse count if available, otherwise estimate from cache
  IF p_current_total_verses IS NOT NULL THEN
    current_total := p_current_total_verses;
  ELSE
    -- Fallback: estimate from cache entry count (conservative)
    SELECT COUNT(*) INTO current_total
    FROM scripture_cache
    WHERE translation = 'esv';
  END IF;
  
  -- If under limit, no action needed
  IF current_total <= p_max_verses THEN
    RETURN 0;
  END IF;
  
  -- Delete oldest entries until under limit
  -- Prioritize whole chapters (references without ':') over individual verses
  -- This is LRU (Least Recently Used) eviction with chapter preference
  WHILE current_total > p_max_verses LOOP
    -- First try to delete oldest whole chapter (no ':' in reference)
    SELECT reference INTO ref_to_delete
    FROM scripture_cache
    WHERE translation = 'esv'
      AND reference NOT LIKE '%:%'  -- Whole chapters don't have ':'
    ORDER BY cached_at ASC
    LIMIT 1;
    
    -- If no chapters found, delete oldest verse reference
    IF ref_to_delete IS NULL THEN
      SELECT reference INTO ref_to_delete
      FROM scripture_cache
      WHERE translation = 'esv'
      ORDER BY cached_at ASC
      LIMIT 1;
    END IF;
    
    -- Exit if nothing to delete
    IF ref_to_delete IS NULL THEN
      EXIT;
    END IF;
    
    -- Delete the selected reference
    DELETE FROM scripture_cache
    WHERE translation = 'esv'
      AND reference = ref_to_delete;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count = 0 THEN
      EXIT; -- No more entries to delete
    END IF;
    
    total_deleted := total_deleted + deleted_count;
    
    -- Decrement count (approximation - caller should recalculate)
    current_total := current_total - 1;
  END LOOP;
  
  RETURN total_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_translation_cache_limit(p_translation text, p_current_total_verses integer DEFAULT NULL::integer, p_max_verses integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
  current_total INTEGER;
  ref_to_delete TEXT;
BEGIN
  IF p_current_total_verses IS NOT NULL THEN
    current_total := p_current_total_verses;
  ELSE
    SELECT COUNT(*) INTO current_total
    FROM scripture_cache
    WHERE translation = p_translation;
  END IF;

  IF current_total <= p_max_verses THEN
    RETURN 0;
  END IF;

  WHILE current_total > p_max_verses LOOP
    SELECT reference INTO ref_to_delete
    FROM scripture_cache
    WHERE translation = p_translation
      AND reference NOT LIKE '%:%'
    ORDER BY cached_at ASC
    LIMIT 1;

    IF ref_to_delete IS NULL THEN
      SELECT reference INTO ref_to_delete
      FROM scripture_cache
      WHERE translation = p_translation
      ORDER BY cached_at ASC
      LIMIT 1;
    END IF;

    IF ref_to_delete IS NULL THEN
      EXIT;
    END IF;

    DELETE FROM scripture_cache
    WHERE translation = p_translation
      AND reference = ref_to_delete;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count = 0 THEN
      EXIT;
    END IF;

    total_deleted := total_deleted + deleted_count;
    current_total := current_total - 1;
  END LOOP;

  RETURN total_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours'
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_pairing_claim_rate_limit(p_client_ip text, p_max_attempts integer DEFAULT 10, p_window_seconds integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row sync_pairing_claim_rate_limits%ROWTYPE;
  v_ip text;
BEGIN
  v_ip := COALESCE(NULLIF(trim(p_client_ip), ''), 'unknown');

  SELECT * INTO v_row
  FROM sync_pairing_claim_rate_limits
  WHERE client_ip = v_ip
  FOR UPDATE;

  IF NOT FOUND OR v_row.window_start + make_interval(secs => p_window_seconds) <= v_now THEN
    INSERT INTO sync_pairing_claim_rate_limits (client_ip, window_start, attempt_count)
    VALUES (v_ip, v_now, 1)
    ON CONFLICT (client_ip) DO UPDATE
      SET window_start = EXCLUDED.window_start,
          attempt_count = 1;
    RETURN true;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  UPDATE sync_pairing_claim_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE client_ip = v_ip;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_backup_tables()
 RETURNS TABLE(table_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.truncate_backup_table(tname text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF tname NOT IN (
    'admin_settings', 'bible_verses', 'coma_templates', 'profile_access',
    'profiles', 'translation_settings', 'user_profiles'
  ) THEN
    RAISE EXCEPTION 'Table % is not allowed for truncate', tname;
  END IF;
  EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', tname);
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_backup_to_storage_job(function_url text, auth_header text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body := '{}'::jsonb
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.run_backup_to_storage_differential_job(function_url text, auth_header text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body := '{"mode":"differential"}'::jsonb
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.spurgeon_public_sermons_page(p_q text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      p.slug::text AS slug,
      p.title::text AS title,
      lower(
        trim(
          coalesce(
            nullif(
              trim(
                regexp_replace(
                  trim(coalesce(p.title, '')),
                  '^\s*sermon\s+[0-9]+(?:-[0-9]+)?\.\s*',
                  '',
                  'i'
                )
              ),
              ''
            ),
            trim(coalesce(p.title, ''))
          )
        )
      ) AS sort_az
    FROM public.profiles p
    WHERE p.is_template = true
      AND p.is_public = true
      AND p.slug LIKE 'sg%'
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR p.title ILIKE '%' || btrim(p_q) || '%'
        OR p.slug ILIKE '%' || btrim(p_q) || '%'
        OR (
          length(regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g')) > 0
          AND (
            regexp_replace(lower(trim(coalesce(p.title, ''))), '[^a-z0-9]+', '', 'g')
              LIKE '%' || regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g') || '%'
            OR regexp_replace(lower(trim(coalesce(p.slug, ''))), '[^a-z0-9]+', '', 'g')
              LIKE '%' || regexp_replace(lower(btrim(p_q)), '[^a-z0-9]+', '', 'g') || '%'
          )
        )
      )
  ),
  page AS (
    SELECT b.slug, b.title, b.sort_az
    FROM base b
    ORDER BY b.sort_az ASC, b.slug ASC
    OFFSET GREATEST(0, p_offset)
    LIMIT LEAST(1000, GREATEST(1, p_limit))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*)::bigint FROM base),
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', pg.slug, 'title', coalesce(pg.title, ''))
          ORDER BY pg.sort_az ASC, pg.slug ASC
        )
        FROM page pg
      ),
      '[]'::jsonb
    )
  );
$function$;

-- Function comments
COMMENT ON FUNCTION public.cleanup_expired_verification_codes() IS 'Removes verification codes that expired or were used more than 24 hours ago. Returns the number of rows deleted.';
COMMENT ON FUNCTION public.enforce_esv_cache_limit(integer, integer) IS 'Enforces LRU cache limit for ESV API (max 500 verses). Prioritizes deleting whole chapters before individual verses. Accepts actual verse count from API for accurate enforcement. Returns count of deleted entries.';
COMMENT ON FUNCTION public.enforce_translation_cache_limit(text, integer, integer) IS 'LRU eviction for scripture_cache rows for a given API-backed translation. Max verses default 500.';
COMMENT ON FUNCTION public.get_backup_tables() IS 'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes, profile_access, and ephemeral device-sync tables (pairing_sessions, sync_pairing_claim_rate_limits). sync_key_entries is included.';
COMMENT ON FUNCTION public.run_backup_to_storage_differential_job(text, text) IS 'Invokes backup-to-storage Edge Function with body {"mode":"differential"} (rows changed since last successful full backup).';
COMMENT ON FUNCTION public.run_backup_to_storage_job(text, text) IS 'Invokes backup-to-storage Edge Function with empty JSON {} = full backup (all rows). Use for weekly full backup (e.g. Sunday).';
COMMENT ON FUNCTION public.spurgeon_public_sermons_page(text, integer, integer) IS 'Public Spurgeon templates: filter (ILIKE + punctuation-insensitive alphanumeric match), count, order A–Z by stripped title, paginate.';
COMMENT ON FUNCTION public.truncate_backup_table(text) IS 'Truncates a table for restore. Used by restore-backup.js. Whitelist tables only.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_spurgeon_passage_index_updated_at ON public.spurgeon_passage_index;
CREATE TRIGGER set_spurgeon_passage_index_updated_at BEFORE UPDATE ON public.spurgeon_passage_index FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auth hook: create user_profiles row on signup (lives on auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coma_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spurgeon_passage_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_key_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_pairing_claim_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies (tables with no policies below rely on service_role bypassing RLS)

DROP POLICY IF EXISTS "Allow public read access to admin_settings" ON public.admin_settings;
CREATE POLICY "Allow public read access to admin_settings" ON public.admin_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Only admins can delete admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can delete admin_settings" ON public.admin_settings
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Only admins can insert admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can insert admin_settings" ON public.admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Only admins can update admin_settings" ON public.admin_settings;
CREATE POLICY "Only admins can update admin_settings" ON public.admin_settings
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can read backup runs" ON public.backup_runs;
CREATE POLICY "Admins can read backup runs" ON public.backup_runs
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "No direct writes to backup runs" ON public.backup_runs;
CREATE POLICY "No direct writes to backup runs" ON public.backup_runs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Admins can delete COMA templates" ON public.coma_templates;
CREATE POLICY "Admins can delete COMA templates" ON public.coma_templates
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can insert COMA templates" ON public.coma_templates;
CREATE POLICY "Admins can insert COMA templates" ON public.coma_templates
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can update COMA templates" ON public.coma_templates;
CREATE POLICY "Admins can update COMA templates" ON public.coma_templates
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Anyone can read COMA templates" ON public.coma_templates;
CREATE POLICY "Anyone can read COMA templates" ON public.coma_templates
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins delete all, creators delete own non-template non-default" ON public.profiles;
CREATE POLICY "Admins delete all, creators delete own non-template non-default" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (((get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text) OR ((created_by = ( SELECT auth.uid() AS uid)) AND (is_default = false) AND (is_template = false))));

DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
CREATE POLICY "Anyone can view all profiles" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;
CREATE POLICY "Authenticated users can create profiles" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((created_by = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "Update profiles" ON public.profiles;
CREATE POLICY "Update profiles" ON public.profiles
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (((( SELECT auth.uid() AS uid) IS NULL) OR (get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text) OR ((created_by = ( SELECT auth.uid() AS uid)) AND (is_default = false))));

DROP POLICY IF EXISTS "Allow scripture access logging" ON public.scripture_access_logs;
CREATE POLICY "Allow scripture access logging" ON public.scripture_access_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can view scripture logs" ON public.scripture_access_logs;
CREATE POLICY "Only admins can view scripture logs" ON public.scripture_access_logs
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Anyone can view scripture cache" ON public.scripture_cache;
CREATE POLICY "Anyone can view scripture cache" ON public.scripture_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage cache" ON public.scripture_cache;
CREATE POLICY "Service role can manage cache" ON public.scripture_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read spurgeon passage index" ON public.spurgeon_passage_index;
CREATE POLICY "Anyone can read spurgeon passage index" ON public.spurgeon_passage_index
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view translation settings" ON public.translation_settings;
CREATE POLICY "Anyone can view translation settings" ON public.translation_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can update translation settings" ON public.translation_settings;
CREATE POLICY "Only admins can update translation settings" ON public.translation_settings
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::user_role)))));

DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete user profiles" ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING ((get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text));

DROP POLICY IF EXISTS "Update user profiles" ON public.user_profiles;
CREATE POLICY "Update user profiles" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (((id = ( SELECT auth.uid() AS uid)) OR (get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text)))
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR (get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text)));

DROP POLICY IF EXISTS "Users can view their own or admins view all" ON public.user_profiles;
CREATE POLICY "Users can view their own or admins view all" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (((id = ( SELECT auth.uid() AS uid)) OR (get_user_role(( SELECT auth.uid() AS uid)) = 'admin'::text)));

DROP POLICY IF EXISTS "Anyone can insert verification codes" ON public.verification_codes;
CREATE POLICY "Anyone can insert verification codes" ON public.verification_codes
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read verification codes" ON public.verification_codes;
CREATE POLICY "Anyone can read verification codes" ON public.verification_codes
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can update verification codes" ON public.verification_codes;
CREATE POLICY "Anyone can update verification codes" ON public.verification_codes
  FOR UPDATE
  TO public
  USING (true);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.admin_settings IS 'System-wide configuration settings';
COMMENT ON TABLE public.pairing_sessions IS 'Short-lived 6-digit pairing codes for device sync key transfer';
COMMENT ON TABLE public.scripture_cache IS 'Caches scripture text from external APIs (ESV, API.Bible) to reduce rate limit usage';
COMMENT ON TABLE public.spurgeon_passage_index IS 'Maps normalized passage keys to Spurgeon sermon profiles for scripture modal Study + library modal.';
COMMENT ON TABLE public.sync_key_entries IS 'Per-key AES-GCM ciphertext for login-free device sync';
COMMENT ON TABLE public.sync_pairing_claim_rate_limits IS 'Per-IP sliding window counters for /api/sync/pairing/claim';
COMMENT ON TABLE public.translation_settings IS 'Controls which Bible translations are available site-wide';
COMMENT ON TABLE public.verification_codes IS 'Stores temporary email verification codes for authentication';

COMMENT ON COLUMN public.admin_settings.verification_code_length IS 'Length of verification code (4, 6, or 8 digits). Default is 6.';
COMMENT ON COLUMN public.admin_settings.verification_code_expiry_minutes IS 'Minutes before verification code expires (5-60 minutes). Default is 15.';
COMMENT ON COLUMN public.admin_settings.enable_verification_code_login IS 'When enabled, users can log in using verification codes sent via email instead of magic links.';
COMMENT ON COLUMN public.admin_settings.public_template_order IS 'Order of public template slugs for the Resources dropdown; empty means use default (title) order.';
COMMENT ON COLUMN public.admin_settings.secular_term_map IS 'SecularTermMapFile JSON: pinnedSectionTitle, introHtml, mappings[{ secularTerms, biblicalTopic, note? }]. Edited in Admin → Settings.';
COMMENT ON COLUMN public.admin_settings.notion_feedback_enabled IS 'When true, profile Help menu shows Send feedback and POST /api/feedback creates a Notion Site issues page.';
COMMENT ON COLUMN public.admin_settings.notion_token IS 'Notion internal integration token; server-only via service role API routes. Optional fallback: NOTION_FEEDBACK_TOKEN env.';
COMMENT ON COLUMN public.admin_settings.notion_database_id IS 'Notion Site issues database or data source ID. Optional fallback: NOTION_FEEDBACK_DATABASE_ID env.';
COMMENT ON COLUMN public.backup_runs.status IS 'running=first slice active; partial=saved checkpoint, continuation pending or in progress; success|warning|failed=terminal';
COMMENT ON COLUMN public.backup_runs.backup_kind IS 'full = complete table export; differential = rows with updated_at >= incremental_base_completed_at (from last successful full).';
COMMENT ON COLUMN public.backup_runs.incremental_base_completed_at IS 'For differential runs: run_completed_at of the full backup used as the change watermark (filter floor).';
COMMENT ON COLUMN public.profiles.saved_answers IS 'Array of saved answers from users: [{ questionId: string, answer: string, answeredAt: timestamp }]';
COMMENT ON COLUMN public.profiles.is_public IS 'When true and is_template = true, anonymous users can view this profile via the Resources dropdown';
COMMENT ON COLUMN public.profiles.include_in_resources_menu IS 'When false, profile is omitted from public Resources dropdown ordering (e.g. Spurgeon sermon templates). Default true for existing rows.';
COMMENT ON COLUMN public.scripture_cache.reference IS 'Scripture reference (e.g., "John 3:16")';
COMMENT ON COLUMN public.scripture_cache.translation IS 'Translation code (esv, kjv, nasb, etc.)';
COMMENT ON COLUMN public.scripture_cache.text IS 'Cached passage plain text (no words-of-Christ markers)';
COMMENT ON COLUMN public.scripture_cache.cached_at IS 'Timestamp when this entry was cached';
COMMENT ON COLUMN public.scripture_cache.woc_text IS 'Optional parallel passage with inline words-of-Christ markers for red-letter reader';
COMMENT ON COLUMN public.spurgeon_passage_index.updated_at IS 'Maintained by trigger; used for differential backups.';
COMMENT ON COLUMN public.translation_settings.translation_code IS 'Short code for the translation (esv, kjv, nasb, etc.)';
COMMENT ON COLUMN public.translation_settings.translation_name IS 'Display name for the translation';
COMMENT ON COLUMN public.translation_settings.is_enabled IS 'Whether this translation is currently available';
COMMENT ON COLUMN public.translation_settings.display_order IS 'Order in which translations appear in dropdown';
COMMENT ON COLUMN public.user_profiles.preferred_translation IS 'Preferred Bible translation for scripture lookups (esv, kjv, nasb, etc.)';
COMMENT ON COLUMN public.user_profiles.view_preference IS 'User preference for viewing profiles: list or card layout';
COMMENT ON COLUMN public.user_profiles.username IS 'Display name for counselees (can be different from email)';
COMMENT ON COLUMN public.verification_codes.email IS 'User email address (lowercase enforced)';
COMMENT ON COLUMN public.verification_codes.code IS 'Numeric verification code (4-8 digits)';
COMMENT ON COLUMN public.verification_codes.action_type IS 'Type of action this code is for';
COMMENT ON COLUMN public.verification_codes.action_data IS 'JSONB metadata for the verification action';
COMMENT ON COLUMN public.verification_codes.expires_at IS 'Code expires after this timestamp (configurable, default 15 min)';
COMMENT ON COLUMN public.verification_codes.used_at IS 'Timestamp when code was used (NULL means not yet used)';

-- ---------------------------------------------------------------------------
-- Grants (Supabase Data API roles)
-- ---------------------------------------------------------------------------
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.coma_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.translation_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.scripture_cache TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.scripture_access_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.verification_codes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.spurgeon_passage_index TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.backup_runs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pairing_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sync_key_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sync_pairing_claim_rate_limits TO anon, authenticated, service_role;

GRANT ALL ON SEQUENCE public.scripture_access_logs_id_seq TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

