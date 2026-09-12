-- Notion Site issues feedback (replaces GitHub issue feedback)
-- Run in Supabase SQL editor after deploying the app that reads these columns.

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS notion_feedback_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS notion_token TEXT;

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS notion_database_id TEXT DEFAULT '';

COMMENT ON COLUMN admin_settings.notion_feedback_enabled IS 'When true, profile Help menu shows Send feedback and POST /api/feedback creates a Notion Site issues page.';
COMMENT ON COLUMN admin_settings.notion_token IS 'Notion internal integration token; server-only via service role API routes. Optional fallback: NOTION_FEEDBACK_TOKEN env.';
COMMENT ON COLUMN admin_settings.notion_database_id IS 'Notion Site issues database or data source ID. Optional fallback: NOTION_FEEDBACK_DATABASE_ID env.';

ALTER TABLE admin_settings
DROP COLUMN IF EXISTS github_feedback_enabled;

ALTER TABLE admin_settings
DROP COLUMN IF EXISTS github_token;

ALTER TABLE admin_settings
DROP COLUMN IF EXISTS github_repo_owner;

ALTER TABLE admin_settings
DROP COLUMN IF EXISTS github_repo_name;
