-- Secular → biblical term map for Biblical Counseling Scripture Reference (admin-editable)
-- Run in Supabase SQL editor, then: npm run seed-biblical-counseling-secular-map

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS secular_term_map JSONB;

COMMENT ON COLUMN admin_settings.secular_term_map IS
  'SecularTermMapFile JSON: pinnedSectionTitle, introHtml, mappings[{ secularTerms, biblicalTopic }]. Edited in Admin → Settings.';
