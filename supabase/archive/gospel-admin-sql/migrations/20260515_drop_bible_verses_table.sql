-- Drop optional bulk-verse storage: public.bible_verses
--
-- Runtime scripture text uses the ESV API, API.Bible, and scripture_cache only
-- (gospel-admin/src/lib/bible-api.ts). This table is not read by the app.
--
-- Only run if you no longer need the import scripts' target table
-- (import-kjv-bible.js, import-nasb-bible.js, import-lsb-bible.js) or a local
-- copy of verses in Postgres. Export or backup first if you care about the data.
--
-- RLS policies on this table are removed with the table. Automated backups that
-- use get_backup_tables() already exclude bible_verses (see 20260509 migration).

DROP TABLE IF EXISTS public.bible_verses CASCADE;
