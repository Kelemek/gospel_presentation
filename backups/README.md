# Database Backup System

This directory contains manual backups of the Supabase database.

Automated backups run natively in Supabase (Edge Function + Storage bucket).

## Decommission Note

- GitHub backup workflows (`backup-database.yml`, `restore-database.yml`) were removed on **2026-05-06**.
- Supabase-native storage backup/restore is now the only automated path.

## Quick Start

### Create a Manual Backup
```bash
cd gospel-admin
npm run backup
```

### Restore
There is **no** `npm run restore` or full-database restore from a monolithic JSON file in this repo.

- **One profile from a Storage backup:** use the **`restore-profile-from-backup`** Edge Function (manifest + gz shards under `db-backups`; see [docs/03-FEATURES.md](../docs/03-FEATURES.md) Backup & Restore).
- **Full database recovery:** use Supabase-hosted backups / PITR / support workflows, or build your own tooling—not covered here.

## Automated Backups

### Supabase-Native (Primary)

Automated backups are performed by the Supabase Edge Function `backup-to-storage` and stored in the private Storage bucket `db-backups`.

**Storage layout (per run — multipart gzip shards):**
- `daily/YYYY-MM-DD/<run_id>/manifest.json` — run metadata + `tables` map: each table name → **ordered list** of shard paths. `metadata.row_layout` is `multipart_gz_shards` (manifest `manifest_version` **4**+); `metadata.backup_chained_slices: true` when the run used multiple Edge invocations.
- `daily/YYYY-MM-DD/<run_id>/tables/<table>/part-NNNN.json.gz` — gzipped `{ "table", "shard_index", "rows": [ … ] }`. Multiple rows per shard to stay under Edge **memory** / **wall clock** (HTTP **546** / `WORKER_RESOURCE_LIMIT`). Large tables are split across invocations using **checkpoints** (see below), not only smaller shards.
- `daily/YYYY-MM-DD/<run_id>/tables/profiles/_slug_index.json` — optional `{ "by_slug": { "<slug>": "<uuid>" } }` so `restore-profile-from-backup` can resolve a slug to an id without scanning every shard first.
- `checkpoints/<run_id>.json` — **resume state** while a run is in progress (`backup_runs.status` = `running` or `partial`). Removed after the run finishes and `backup_runs` is updated successfully.
- **Older layouts:** objects directly under `daily/YYYY-MM-DD/` (no `<run_id>`), `metadata.row_layout: one_file_per_row`, legacy single-object table dumps, or monolithic JSON — still read by restore logic when present.
- `latest/latest-backup.json` pointer — JSON with `format: "chunked_v1"` and `manifest_path` (full path includes `daily/…/<run_id>/manifest.json` for current runs).
- Legacy monolith: `daily/YYYY-MM-DD/database-backup-YYYY-MM-DD.json.gz`; retention prunes by **calendar day** prefix under `daily/` (all run folders under that day are removed together when the date rolls out of the window).

**Edge Function env (memory + ~150s timeout):**

| Variable | Default | Role |
|---------|---------|------|
| `BACKUP_FETCH_RANGE_ROWS` | `500` | PostgREST `.range()` page size (max `1000`). Larger = fewer DB round trips per invocation. |
| `BACKUP_TABLE_SHARD_MAX_ROWS` | `4` | Max rows per gzip shard before flush. Lower reduces **CPU time** per shard (Edge may log `CPU Time exceeded` / **546**) and upload size; higher = fewer PUTs. |
| `BACKUP_SHARD_APPROX_UTF8_BYTES` | `120000` | Flush shard when summed per-row JSON UTF-8 sizes reach this. |
| `BACKUP_SLICE_MS` | `45000` | Max time per **invocation**; then checkpoint + chained `POST` with `{"resume_run_id":"<same run>"}` to continue (stays under Edge limits). Continuations use **`EdgeRuntime.waitUntil`** so the follow-up request actually runs after the first response returns (plain `queueMicrotask`/`fetch` without `waitUntil` is often dropped when the worker shuts down). |
| `BACKUP_STORAGE_UPLOAD_MAX_ATTEMPTS` | `5` | Retries per Storage `upload` on transient errors (**Gateway Timeout**, 5xx, etc.). |
| `BACKUP_STORAGE_RETRY_BASE_MS` | `400` | Base delay for exponential backoff between upload retries (capped ~10s + jitter). |
| `BACKUP_SOFT_DEADLINE_MS` | _(unset)_ | Optional: e.g. `130000` aborts with a clear error before the platform ~150s kill. Unset or `0` = off. |

**Metadata/logging:**
- `public.backup_runs` records status (`running` → `partial` while continuations run → `success|warning|failed`), bytes, table deltas, warnings, and errors. Requires migration allowing `partial` (`sql/migrations/20260508_backup_runs_checkpoint_status.sql`).

**Table discovery:**
- Uses `get_backup_tables()` to dynamically include new `public` tables (excludes cache/log/session tables, `backup_runs`, `bible_verses`, `scripture_access_logs`, `verification_codes`; apply **`sql/migrations/20260509_get_backup_tables_fix_log_exclusions.sql`** if an older migration still listed the wrong log table name and pulled full access logs into backups).

**Retention (free-tier guardrail):**
- Keep a short rolling window (recommended: 7 daily backups).

**Failure notifications:**
- On warning/failure, the function sends email using the existing Supabase email pipeline (`send-email`) to users who have `role='admin'` in `user_profiles`.

### Backup Schedule
- **Automated (primary)**: Supabase cron invokes `backup-to-storage` with an empty body `{}` — that starts a **new** run (`backup_runs` row + new `daily/<date>/<run_id>/` prefix) once per schedule.
- **Within one run**: After each slice hits `BACKUP_SLICE_MS`, the function returns **200** with `continuing: true` and saves a checkpoint; **`EdgeRuntime.waitUntil`** issues the next `POST` with `{"resume_run_id":"<that run's uuid>"}` so the **same** logical backup continues. You do **not** need a second cron for that chain.
- **If a run stays `partial`**: The self-POST may have failed (check logs for `backup_continuation_http_error`). Optionally add a **staggered** cron (e.g. hourly) that POSTs resume for rows in `partial` older than a few minutes, or invoke resume manually from SQL/API.
- **Manual local**: Run anytime with `npm run backup` (stored locally)

## Backup Structure

### Database Backup Format
```json
{
  "backup_date": "2025-10-31T12:00:00.000Z",
  "backup_type": "automated|manual",
  "version": "1.0",
  "tables": {
    "profiles": [...],
    "user_profiles": [...]
  },
  "metadata": {
    "total_records": 10,
    "tables_count": 2
  }
}
```

### Files Created
- `database-backup-YYYY-MM-DD.json` - Daily timestamped backup
- `latest-backup.json` - Always contains the most recent backup
- `profiles/YYYY-MM-DD/` - Individual profile backups (compatible with admin restore)

## Restore

### Individual Profile Restore
Use the admin interface:
1. Go to `/admin`
2. Find the profile you want to restore
3. Click "Restore from Backup"
4. Select the profile backup file from `backups/profiles/YYYY-MM-DD/`

## Best Practices

### Regular Backups
- Run manual backup before major changes: `npm run backup`
- Supabase Edge Function handles daily automated backups
- Keep important backups in multiple locations

### Version Control
- Backup files are committed to Git for version history
- Each backup includes timestamp and metadata
- Easy to restore to any previous state

### Recovery Scenarios

**Lost many or all profiles:** rely on **Supabase Storage** automated backups (`backup-to-storage`) and platform-level recovery; there is no in-repo full JSON restore CLI.

**Lost single profile:**
1. Use admin interface restore feature
2. Select profile backup from `backups/profiles/`

**Database corrupted:** use Supabase dashboard backups / support; inspect `public.backup_runs` and `db-backups` for recent good runs.

## Backup Storage

### Supabase Storage (Primary)
- Backups are private objects in bucket `db-backups`
- Automated layout uses gzipped shards `tables/<name>/part-*.json.gz` plus a manifest (`manifest.json`); optional per-row experimental layouts may exist in older runs.
- Retention pruning happens in backup run (drops whole `daily/YYYY-MM-DD/` prefixes older than the window).
- `backup_runs` table provides run history and failure diagnostics (`backup_path` points at `…/manifest.json`).

### Local (Manual Backups)
- `backups/` directory in repository
- Run manually with `npm run backup`
- Individual profile backups in `profiles/` subdirectory
- **Recommended**: Commit important manual backups to Git

### External (Recommended)
Consider additional backup locations for critical data:
- Cloud storage (Google Drive, Dropbox, iCloud)
- External hard drive
- Different Git hosting service

## Troubleshooting

### Backup fails
- Check Supabase credentials in `.env.local`
- Verify network connection
- Check Supabase service status

### Supabase backup fails
- Check `public.backup_runs` latest row (`error_message` is set on failures; use the row `id` as `resume_run_id` only when a checkpoint exists)
- Check Edge Function logs for `backup-to-storage`
- Confirm `db-backups` bucket exists and service role key is valid
- Verify admin users exist in `user_profiles` for alert emails
- **HTTP 546 / `WORKER_RESOURCE_LIMIT`**: Edge wall clock **or** memory **or** **CPU time** (dashboard may show `CPU Time exceeded` even well under 150s). Lower **`BACKUP_TABLE_SHARD_MAX_ROWS`** / **`BACKUP_SHARD_APPROX_UTF8_BYTES`** so each gzip shard is smaller (less CPU per `flush`); shorten **`BACKUP_SLICE_MS`** to chain more often. If logs show **Gateway Timeout** on `storage.upload`, rely on **`BACKUP_STORAGE_UPLOAD_*`** retries or reduce shard size further.
- **HTTP 500 / `EDGE_FUNCTION_ERROR`**: Open Edge logs for the same timestamp; the handler logs `backup_to_storage_failed` with the message. Common causes: **`BACKUP_SOFT_DEADLINE_MS`** exceeded, Storage upload error, or JSON serialization error on a bad row.
- **Retention / “schema must be one of: public, graphql_public”**: Hosted PostgREST often cannot query **`storage.objects`**. The function **falls back** to the Storage **`list`** API (log event `backup_prune_using_storage_list_fallback`) so pruning still runs; older deployments that only warned and skipped pruning should be redeployed.

## Scripts

### backup-database.js
Manual backup script that creates timestamped backups.

**Usage:**
```bash
node scripts/backup-database.js
```

**Output:**
- Full database backup
- Latest backup file
- Individual profile backups

## Environment Variables

For **`npm run backup`** (`backup-database.js`), set in `gospel-admin/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Other admin scripts may require `SUPABASE_SERVICE_ROLE_KEY`; see each script’s header.

## Support

For issues or questions:
1. Check manual backup files exist and are valid JSON (if using `npm run backup`)
2. Verify environment variables are set
3. Check Supabase dashboard for `backup_runs`, Edge logs, and Storage `db-backups`
4. Review recent Git commits for backup history
