-- GitHub feedback integration settings on admin_settings
-- Run in Supabase SQL editor

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS github_feedback_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS github_token TEXT;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS github_repo_owner TEXT DEFAULT '';

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS github_repo_name TEXT DEFAULT '';

COMMENT ON COLUMN admin_settings.github_feedback_enabled IS 'When true, profile Help menu shows Send feedback and POST /api/feedback creates GitHub issues.';
COMMENT ON COLUMN admin_settings.github_token IS 'GitHub PAT with repo/issues scope; server-only via service role API routes.';
COMMENT ON COLUMN admin_settings.github_repo_owner IS 'GitHub username or org for feedback issues repository.';
COMMENT ON COLUMN admin_settings.github_repo_name IS 'GitHub repository name for feedback issues.';
