-- Supabase-native storage backups (free-tier aware)
-- Run in Supabase SQL Editor with a service role connection.

-- 1) Private bucket for backups
insert into storage.buckets (id, name, public)
values ('db-backups', 'db-backups', false)
on conflict (id) do nothing;

-- 2) Backup metadata table
create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  run_started_at timestamptz not null default now(),
  run_completed_at timestamptz,
  status text not null check (status in ('running', 'success', 'warning', 'failed')),
  backup_path text,
  backup_bytes bigint,
  table_count integer,
  row_count_total bigint,
  table_names jsonb not null default '[]'::jsonb,
  table_hash text,
  new_tables jsonb not null default '[]'::jsonb,
  missing_tables jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  admin_recipients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists backup_runs_created_at_idx on public.backup_runs (created_at desc);
create index if not exists backup_runs_status_idx on public.backup_runs (status);

-- 3) RLS: only admins can read backup runs
alter table public.backup_runs enable row level security;

drop policy if exists "Admins can read backup runs" on public.backup_runs;
create policy "Admins can read backup runs"
on public.backup_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);

-- No direct client writes/updates/deletes.
drop policy if exists "No direct writes to backup runs" on public.backup_runs;
create policy "No direct writes to backup runs"
on public.backup_runs
for all
to authenticated
using (false)
with check (false);

-- 4) Scheduler helper function (no config table required)
create or replace function public.run_backup_to_storage_job(
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
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.run_backup_to_storage_job(text, text) from public;
grant execute on function public.run_backup_to_storage_job(text, text) to postgres, service_role;

comment on function public.run_backup_to_storage_job(text, text) is
  'Invokes backup-to-storage Edge Function using explicit URL and Authorization header.';

-- NOTE:
-- To schedule in SQL editor after extension setup:
--   select cron.schedule(
--     'backup-to-storage-daily',
--     '0 2 * * *',
--     $$select public.run_backup_to_storage_job(
--       'https://<project-ref>.supabase.co/functions/v1/backup-to-storage',
--       'Bearer <invoke-secret-or-jwt>'
--     );$$
--   );
-- To unschedule:
--   select cron.unschedule(jobid) from cron.job where jobname='backup-to-storage-daily';
