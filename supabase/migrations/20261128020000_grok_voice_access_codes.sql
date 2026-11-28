-- Grok resource Listen access codes.
-- Plaintext codes and device tokens are never stored. Redeem and speech
-- checks hash them and compare. Tables are service-role only, like pairing_sessions.

-- Role changes stay admin-only. Grok voice is no longer a profile flag.
CREATE OR REPLACE FUNCTION public.protect_user_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF coalesce(auth.role(), '') = 'service_role'
       OR public.get_user_role(auth.uid()) = 'admin' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only an admin can change role';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_profiles_protect_role_and_grok_voice ON public.user_profiles;
DROP TRIGGER IF EXISTS user_profiles_protect_role ON public.user_profiles;
CREATE TRIGGER user_profiles_protect_role
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_role();

DROP FUNCTION IF EXISTS public.protect_user_profile_role_and_grok_voice();

ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS grok_voice_enabled;

CREATE TABLE public.grok_voice_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code_hash text NOT NULL,
  max_devices integer NOT NULL DEFAULT 3,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grok_voice_codes_name_present CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 120),
  CONSTRAINT grok_voice_codes_code_hash_unique UNIQUE (code_hash),
  CONSTRAINT grok_voice_codes_code_hash_sha256 CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT grok_voice_codes_max_devices_range CHECK (max_devices >= 1 AND max_devices <= 100)
);

CREATE TABLE public.grok_voice_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.grok_voice_codes (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  device_label text,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grok_voice_devices_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT grok_voice_devices_token_hash_sha256 CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT grok_voice_devices_label_length CHECK (device_label IS NULL OR char_length(device_label) <= 80)
);

CREATE INDEX grok_voice_devices_code_id_idx ON public.grok_voice_devices (code_id);

CREATE TABLE public.grok_voice_usage (
  device_id uuid NOT NULL REFERENCES public.grok_voice_devices (id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES public.grok_voice_codes (id) ON DELETE CASCADE,
  month_key text NOT NULL,
  chars bigint NOT NULL DEFAULT 0,
  audio_seconds numeric NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  includes_estimate boolean NOT NULL DEFAULT false,
  PRIMARY KEY (device_id, month_key),
  CONSTRAINT grok_voice_usage_month_key CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT grok_voice_usage_nonnegative CHECK (chars >= 0 AND audio_seconds >= 0 AND cost_usd >= 0)
);

CREATE INDEX grok_voice_usage_code_month_idx ON public.grok_voice_usage (code_id, month_key);

CREATE TABLE public.grok_voice_rate_limits (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempt_count integer NOT NULL,
  CONSTRAINT grok_voice_rate_limits_count CHECK (attempt_count >= 0)
);

COMMENT ON TABLE public.grok_voice_codes IS 'Grok Listen access codes. code_hash is sha256 of the normalized code. Plaintext is not stored.';
COMMENT ON TABLE public.grok_voice_devices IS 'Devices that redeemed a Grok Listen code. token_hash is sha256 of the device token. Plaintext is not stored.';
COMMENT ON TABLE public.grok_voice_usage IS 'Per-device America/Chicago month buckets for Grok Listen characters, audio seconds, and cost.';
COMMENT ON TABLE public.grok_voice_rate_limits IS 'Shared counters for Grok Listen redeem and speech rate limits.';

ALTER TABLE public.grok_voice_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grok_voice_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grok_voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grok_voice_rate_limits ENABLE ROW LEVEL SECURITY;

-- Keep in step with evaluateGrokVoiceRedeem: unused codes expire, revoked
-- codes fail, and only non-revoked devices count toward max_devices.
CREATE OR REPLACE FUNCTION public.redeem_grok_voice_code(
  p_code_hash text,
  p_token_hash text,
  p_device_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code public.grok_voice_codes%ROWTYPE;
  v_active integer;
  v_device_id uuid;
  v_label text;
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$'
     OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO v_code
  FROM public.grok_voice_codes
  WHERE code_hash = p_code_hash
  FOR UPDATE;

  IF NOT FOUND OR v_code.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT count(*)::integer INTO v_active
  FROM public.grok_voice_devices
  WHERE code_id = v_code.id
    AND revoked_at IS NULL;

  IF v_active = 0 AND v_code.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF v_active >= v_code.max_devices THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_label := NULLIF(left(btrim(coalesce(p_device_label, '')), 80), '');

  INSERT INTO public.grok_voice_devices (code_id, token_hash, device_label)
  VALUES (v_code.id, p_token_hash, v_label)
  RETURNING id INTO v_device_id;

  RETURN jsonb_build_object('ok', true, 'code_id', v_code.id, 'device_id', v_device_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_grok_voice_token(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_device_id uuid;
  v_code_id uuid;
  v_device_revoked timestamptz;
  v_code_revoked timestamptz;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT d.id, d.code_id, d.revoked_at, c.revoked_at
  INTO v_device_id, v_code_id, v_device_revoked, v_code_revoked
  FROM public.grok_voice_devices d
  JOIN public.grok_voice_codes c ON c.id = d.code_id
  WHERE d.token_hash = p_token_hash;

  IF NOT FOUND OR v_device_revoked IS NOT NULL OR v_code_revoked IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  RETURN jsonb_build_object('ok', true, 'code_id', v_code_id, 'device_id', v_device_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_grok_voice_usage(
  p_token_hash text,
  p_chars integer,
  p_audio_seconds numeric,
  p_estimated boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_device_id uuid;
  v_code_id uuid;
  v_device_revoked timestamptz;
  v_code_revoked timestamptz;
  v_month text;
  v_cost numeric;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR p_chars IS NULL OR p_chars < 0
     OR p_audio_seconds IS NULL OR p_audio_seconds < 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT d.id, d.code_id, d.revoked_at, c.revoked_at
  INTO v_device_id, v_code_id, v_device_revoked, v_code_revoked
  FROM public.grok_voice_devices d
  JOIN public.grok_voice_codes c ON c.id = d.code_id
  WHERE d.token_hash = p_token_hash
  FOR UPDATE OF d;

  IF NOT FOUND OR v_device_revoked IS NOT NULL OR v_code_revoked IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_month := to_char(now() AT TIME ZONE 'America/Chicago', 'YYYY-MM');
  v_cost := (p_chars::numeric) * 15.0 / 1000000.0;

  INSERT INTO public.grok_voice_usage (
    device_id, code_id, month_key, chars, audio_seconds, cost_usd, includes_estimate
  )
  VALUES (
    v_device_id, v_code_id, v_month, p_chars, p_audio_seconds, v_cost, coalesce(p_estimated, false)
  )
  ON CONFLICT (device_id, month_key) DO UPDATE
  SET chars = public.grok_voice_usage.chars + EXCLUDED.chars,
      audio_seconds = public.grok_voice_usage.audio_seconds + EXCLUDED.audio_seconds,
      cost_usd = public.grok_voice_usage.cost_usd + EXCLUDED.cost_usd,
      includes_estimate = public.grok_voice_usage.includes_estimate OR EXCLUDED.includes_estimate;

  UPDATE public.grok_voice_devices
  SET last_used_at = now()
  WHERE id = v_device_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code_id', v_code_id,
    'device_id', v_device_id,
    'chars', p_chars,
    'cost_usd', v_cost
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_grok_voice_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row public.grok_voice_rate_limits%ROWTYPE;
  v_key text;
BEGIN
  v_key := left(coalesce(nullif(btrim(p_bucket_key), ''), 'unknown'), 200);
  IF p_max_attempts IS NULL OR p_max_attempts < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_row
  FROM public.grok_voice_rate_limits
  WHERE bucket_key = v_key
  FOR UPDATE;

  IF NOT FOUND OR v_row.window_start + make_interval(secs => p_window_seconds) <= v_now THEN
    INSERT INTO public.grok_voice_rate_limits (bucket_key, window_start, attempt_count)
    VALUES (v_key, v_now, 1)
    ON CONFLICT (bucket_key) DO UPDATE
      SET window_start = EXCLUDED.window_start,
          attempt_count = 1;
    RETURN true;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  UPDATE public.grok_voice_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE bucket_key = v_key;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grok_voice_rate_limit_open(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row public.grok_voice_rate_limits%ROWTYPE;
  v_key text;
BEGIN
  v_key := left(coalesce(nullif(btrim(p_bucket_key), ''), 'unknown'), 200);
  IF p_max_attempts IS NULL OR p_max_attempts < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_row
  FROM public.grok_voice_rate_limits
  WHERE bucket_key = v_key;

  IF NOT FOUND OR v_row.window_start + make_interval(secs => p_window_seconds) <= v_now THEN
    RETURN true;
  END IF;

  RETURN v_row.attempt_count < p_max_attempts;
END;
$function$;

REVOKE ALL ON TABLE public.grok_voice_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.grok_voice_devices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.grok_voice_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.grok_voice_rate_limits FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.grok_voice_codes TO service_role;
GRANT ALL ON TABLE public.grok_voice_devices TO service_role;
GRANT ALL ON TABLE public.grok_voice_usage TO service_role;
GRANT ALL ON TABLE public.grok_voice_rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.redeem_grok_voice_code(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lookup_grok_voice_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_grok_voice_usage(text, integer, numeric, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_grok_voice_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grok_voice_rate_limit_open(text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_grok_voice_code(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.lookup_grok_voice_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_grok_voice_usage(text, integer, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_grok_voice_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grok_voice_rate_limit_open(text, integer, integer) TO service_role;

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
      'sync_pairing_claim_rate_limits',
      'grok_voice_codes',
      'grok_voice_devices',
      'grok_voice_usage',
      'grok_voice_rate_limits'
    )
  ORDER BY t.tablename;
$function$;

COMMENT ON FUNCTION public.get_backup_tables() IS 'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes, profile_access, ephemeral device-sync tables (pairing_sessions, sync_pairing_claim_rate_limits), and Grok voice code tables (grok_voice_codes, grok_voice_devices, grok_voice_usage, grok_voice_rate_limits). sync_key_entries is included.';
