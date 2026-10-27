-- Login-free device sync: pairing codes, encrypted key entries, distributed claim rate limits.
-- All access via service role in Next.js API routes (no client policies).
-- Safe to re-run: uses IF NOT EXISTS, CREATE OR REPLACE, and idempotent GRANT/REVOKE.
-- Safe to run in production before the app deploy: additive only; existing features unchanged.

-- Pairing sessions (short-lived 6-digit codes)
CREATE TABLE IF NOT EXISTS pairing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  storage_id text NOT NULL,
  encrypted_sync_key text,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pairing_sessions_code_unique ON pairing_sessions (code);
CREATE INDEX IF NOT EXISTS pairing_sessions_expires_at_idx ON pairing_sessions (expires_at);

COMMENT ON TABLE pairing_sessions IS 'Short-lived 6-digit pairing codes for device sync key transfer';

-- Per-key encrypted sync payloads
CREATE TABLE IF NOT EXISTS sync_key_entries (
  storage_id text NOT NULL,
  storage_key text NOT NULL,
  ciphertext text NOT NULL DEFAULT '',
  content_hash text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (storage_id, storage_key)
);

CREATE INDEX IF NOT EXISTS sync_key_entries_storage_updated_idx
  ON sync_key_entries (storage_id, updated_at);

COMMENT ON TABLE sync_key_entries IS 'Per-key AES-GCM ciphertext for login-free device sync';

-- Block direct PostgREST access (anon/authenticated); API routes use service role.
ALTER TABLE pairing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_key_entries ENABLE ROW LEVEL SECURITY;

-- Distributed rate limiting for POST /api/sync/pairing/claim (shared across serverless instances)
CREATE TABLE IF NOT EXISTS sync_pairing_claim_rate_limits (
  client_ip text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE sync_pairing_claim_rate_limits IS 'Per-IP sliding window counters for /api/sync/pairing/claim';

ALTER TABLE sync_pairing_claim_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_pairing_claim_rate_limit(
  p_client_ip text,
  p_max_attempts integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON TABLE sync_pairing_claim_rate_limits FROM PUBLIC;
REVOKE ALL ON FUNCTION check_pairing_claim_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_pairing_claim_rate_limit(text, integer, integer) TO service_role;
