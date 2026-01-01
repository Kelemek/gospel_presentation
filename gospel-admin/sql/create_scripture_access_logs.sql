-- Create scripture_access_logs table for tracking all scripture requests
-- Tracks ESV (API), KJV (database), NASB (database), and any future translations
-- Supports both authenticated and anonymous users via session IDs

CREATE TABLE scripture_access_logs (
  id BIGSERIAL PRIMARY KEY,
  scripture_reference TEXT NOT NULL,
  translation TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  year_accessed INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM timestamp)) STORED
);

-- Index for annual reporting by translation
CREATE INDEX idx_scripture_access_translation_year 
ON scripture_access_logs(translation, year_accessed);

-- Index for session tracking
CREATE INDEX idx_scripture_access_session 
ON scripture_access_logs(session_id, translation);

-- Composite index for common reporting queries
CREATE INDEX idx_scripture_access_reporting 
ON scripture_access_logs(translation, year_accessed, session_id);

-- Enable RLS (Row Level Security) - allow inserts from authenticated and anon, selects for admins only
ALTER TABLE scripture_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from anyone (authenticated or anon)
CREATE POLICY "Allow scripture access logging"
ON scripture_access_logs FOR INSERT
WITH CHECK (true);

-- Policy: Allow selects only for admin users
CREATE POLICY "Only admins can view scripture logs"
ON scripture_access_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
    AND user_profiles.role = 'admin'
  )
);

-- Grant permissions
GRANT INSERT ON scripture_access_logs TO authenticated, anon;
GRANT SELECT ON scripture_access_logs TO authenticated;
