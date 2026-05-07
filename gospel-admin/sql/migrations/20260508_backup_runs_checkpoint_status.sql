-- Allow "partial" while a chained backup is between Edge continuations.
alter table public.backup_runs drop constraint if exists backup_runs_status_check;
alter table public.backup_runs add constraint backup_runs_status_check
  check (status in ('running', 'partial', 'success', 'warning', 'failed'));

comment on column public.backup_runs.status is
  'running=first slice active; partial=saved checkpoint, continuation pending or in progress; success|warning|failed=terminal';
