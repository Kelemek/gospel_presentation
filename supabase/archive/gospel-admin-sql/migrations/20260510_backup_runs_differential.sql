-- Differential backup metadata for backup-to-storage Edge Function.
ALTER TABLE public.backup_runs
  ADD COLUMN IF NOT EXISTS backup_kind text NOT NULL DEFAULT 'full'
    CHECK (backup_kind IN ('full', 'differential'));

ALTER TABLE public.backup_runs
  ADD COLUMN IF NOT EXISTS incremental_base_completed_at timestamptz;

COMMENT ON COLUMN public.backup_runs.backup_kind IS
  'full = complete table export; differential = rows with updated_at >= incremental_base_completed_at (from last successful full).';

COMMENT ON COLUMN public.backup_runs.incremental_base_completed_at IS
  'For differential runs: run_completed_at of the full backup used as the change watermark (filter floor).';
