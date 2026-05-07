-- Differential backup scheduler helper + pg_cron documentation.
-- Requires extensions: pg_cron, pg_net (same as 20260506_supabase_storage_backups.sql).

create or replace function public.run_backup_to_storage_differential_job(
  function_url text,
  auth_header text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body := '{"mode":"differential"}'::jsonb
  );
end;
$$;

revoke all on function public.run_backup_to_storage_differential_job(text, text) from public;
grant execute on function public.run_backup_to_storage_differential_job(text, text) to postgres, service_role;

comment on function public.run_backup_to_storage_differential_job(text, text) is
  'Invokes backup-to-storage Edge Function with body {"mode":"differential"} (rows changed since last successful full backup).';

comment on function public.run_backup_to_storage_job(text, text) is
  'Invokes backup-to-storage Edge Function with empty JSON {} = full backup (all rows). Use for weekly full backup (e.g. Sunday).';

-- Recommended pg_cron setup (UTC — adjust hour/day for your timezone):
--
-- 1) Full backup weekly on Sunday 02:00 UTC:
--    select cron.schedule(
--      'backup-to-storage-full-sunday',
--      '0 2 * * 0',
--      $$select public.run_backup_to_storage_job(
--        'https://<project-ref>.supabase.co/functions/v1/backup-to-storage',
--        'Bearer <invoke-secret-or-jwt>'
--      );$$
--    );
--
-- 2) Differential backup Monday–Saturday 02:00 UTC:
--    select cron.schedule(
--      'backup-to-storage-differential-weekdays',
--      '0 2 * * 1-6',
--      $$select public.run_backup_to_storage_differential_job(
--        'https://<project-ref>.supabase.co/functions/v1/backup-to-storage',
--        'Bearer <invoke-secret-or-jwt>'
--      );$$
--    );
--
-- Unschedule examples:
--    select cron.unschedule(jobid) from cron.job where jobname = 'backup-to-storage-full-sunday';
--    select cron.unschedule(jobid) from cron.job where jobname = 'backup-to-storage-differential-weekdays';
--
-- If replacing a single daily job named backup-to-storage-daily, unschedule it first to avoid duplicate backups.
