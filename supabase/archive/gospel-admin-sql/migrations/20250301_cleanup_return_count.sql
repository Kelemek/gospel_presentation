-- Migration: Make cleanup_expired_verification_codes return deleted row count
-- Run this in Supabase SQL Editor to enable visibility in the GitHub Action

CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours'
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_verification_codes() IS 'Removes verification codes that expired or were used more than 24 hours ago. Returns the number of rows deleted.';
