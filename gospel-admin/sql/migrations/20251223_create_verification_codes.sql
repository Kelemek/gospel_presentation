-- Migration: Add email verification code system
-- Based on: https://github.com/Kelemek/angular_prayerapp
-- Description: Creates verification_codes table for numeric code authentication
-- Author: System
-- Date: 2025-12-23

-- ============================================================================
-- PART 1: Create admin_settings table and add verification code configuration
-- ============================================================================

-- Create admin_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Add verification code settings to admin_settings table
-- These control code length and expiry time
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS verification_code_length INTEGER DEFAULT 6 
CHECK (verification_code_length IN (4, 6, 8));

ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS verification_code_expiry_minutes INTEGER DEFAULT 15 
CHECK (verification_code_expiry_minutes >= 5 AND verification_code_expiry_minutes <= 60);

-- Add enable/disable toggle for verification code login
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS enable_verification_code_login BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON TABLE admin_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN admin_settings.verification_code_length IS 'Length of verification code (4, 6, or 8 digits). Default is 6.';
COMMENT ON COLUMN admin_settings.verification_code_expiry_minutes IS 'Minutes before verification code expires (5-60 minutes). Default is 15.';
COMMENT ON COLUMN admin_settings.enable_verification_code_login IS 'When enabled, users can log in using verification codes sent via email instead of magic links.';

-- ============================================================================
-- PART 2: Create verification_codes table
-- ============================================================================

-- This table stores temporary verification codes sent to users for authentication
-- Codes expire after a configurable time period and can only be used once
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_login',           -- Standard user login
    'admin_login',          -- Admin authentication
    'counselor_login',      -- Counselor authentication
    'password_reset',       -- Future: password reset flow
    'email_verification'    -- Future: email address verification
  )),
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Stores metadata about the action
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT verification_codes_email_lower_check CHECK (email = lower(email))
);

-- Add comments
COMMENT ON TABLE verification_codes IS 'Stores temporary email verification codes for authentication';
COMMENT ON COLUMN verification_codes.email IS 'User email address (lowercase enforced)';
COMMENT ON COLUMN verification_codes.code IS 'Numeric verification code (4-8 digits)';
COMMENT ON COLUMN verification_codes.action_type IS 'Type of action this code is for';
COMMENT ON COLUMN verification_codes.action_data IS 'JSONB metadata for the verification action';
COMMENT ON COLUMN verification_codes.expires_at IS 'Code expires after this timestamp (configurable, default 15 min)';
COMMENT ON COLUMN verification_codes.used_at IS 'Timestamp when code was used (NULL means not yet used)';

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_action_type ON verification_codes(action_type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_used_at ON verification_codes(used_at) WHERE used_at IS NOT NULL;

-- ============================================================================
-- PART 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert verification codes (when requesting login code)
DROP POLICY IF EXISTS "Anyone can insert verification codes" ON verification_codes;
CREATE POLICY "Anyone can insert verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to select verification codes (when verifying code)
DROP POLICY IF EXISTS "Anyone can read verification codes" ON verification_codes;
CREATE POLICY "Anyone can read verification codes"
  ON verification_codes
  FOR SELECT
  USING (true);

-- Allow updates for marking codes as used
DROP POLICY IF EXISTS "Anyone can update verification codes" ON verification_codes;
CREATE POLICY "Anyone can update verification codes"
  ON verification_codes
  FOR UPDATE
  USING (true);

-- ============================================================================
-- PART 5: Create cleanup function for expired codes
-- ============================================================================

-- Function to clean up expired verification codes
-- This should be run periodically (e.g., via cron job or scheduled task)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete codes that expired more than 24 hours ago (keep for audit)
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours'
  
  -- Also delete used codes older than 24 hours
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours');
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up expired verification codes';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_verification_codes() IS 'Removes verification codes that expired or were used more than 24 hours ago';

-- ============================================================================
-- PART 6: Initialize admin_settings if needed
-- ============================================================================

-- Ensure admin_settings table has at least one row
-- (This is needed if the table was just created)
INSERT INTO admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Set default values for verification code settings
UPDATE admin_settings
SET 
  verification_code_length = COALESCE(verification_code_length, 6),
  verification_code_expiry_minutes = COALESCE(verification_code_expiry_minutes, 15),
  enable_verification_code_login = COALESCE(enable_verification_code_login, false)
WHERE id = 1;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification:
-- SELECT * FROM verification_codes LIMIT 0; -- Should show table structure
-- SELECT verification_code_length, verification_code_expiry_minutes, enable_verification_code_login FROM admin_settings WHERE id = 1;
