-- Document row-level exclusion of re-importable CCEL corpora in Edge backups.
-- Tables remain listed so user profiles and non-corpus passage index rows are still exported.

COMMENT ON FUNCTION get_backup_tables() IS
  'Returns public tables to include in JSON exports. Excludes migration bookkeeping, scripture cache, scripture access logs, session audit log, backup_runs, bible_verses, verification_codes. '
  'profiles and spurgeon_passage_index are included but backup-to-storage omits rows for CCEL corpora (sg/me/cv/mh/je/lgal) that can be re-imported via npm scripts; disaster recovery for those uses import-spurgeon, import-henry, import-calvin, import-morneve, import-edwards, import-luther-galatians.';
