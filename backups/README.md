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
- **Full backup** (default): prefix `daily/YYYY-MM-DD/<run_id>/` — complete export of all rows from `get_backup_tables()`.
- **Differential backup**: POST body `{"mode":"differential"}` — prefix `differential/YYYY-MM-DD/<run_id>/`; each table exports rows with `updated_at >= run_completed_at` of the **latest successful full** backup (`backup_runs.backup_kind = full`, status `success` or `warning`). Deletes are **not** captured; rely on the weekly full + Supabase platform backups for tombstones.
- `daily/…` or `differential/…/<run_id>/manifest.json` — run metadata + `tables` map: each table name → **ordered list** of shard paths. Manifest `metadata.backup_kind` is `full` or `differential`; `metadata.differential_since` is set when differential. `metadata.row_layout` is `multipart_gz_shards` (manifest `manifest_version` **4**+); `metadata.backup_chained_slices: true` when the run used multiple Edge invocations.
- `daily/…` or `differential/…/<run_id>/tables/<table>/part-NNNN.json.gz` — gzipped `{ "table", "shard_index", "rows": [ … ] }`. Multiple rows per shard to stay under Edge **memory** / **wall clock** (HTTP **546** / `WORKER_RESOURCE_LIMIT`). Large tables are split across invocations using **checkpoints** (see below), not only smaller shards.
- `daily/…` or `differential/…/<run_id>/tables/profiles/_slug_index.json` — optional `{ "by_slug": { "<slug>": "<uuid>" } }` so `restore-profile-from-backup` can resolve a slug to an id without scanning every shard first (full backups with changed profiles; differential may omit unchanged profiles).
- `checkpoints/<run_id>.json` — **resume state** while a run is in progress (`backup_runs.status` = `running` or `partial`). Removed after the run finishes and `backup_runs` is updated successfully.
- **Older layouts:** objects directly under `daily/YYYY-MM-DD/` (no `<run_id>`), `metadata.row_layout: one_file_per_row`, legacy single-object table dumps, or monolithic JSON — still read by restore logic when present.
- `latest/latest-backup.json` pointer — updated **only on successful full backups**; JSON with `format: "chunked_v1"`, `manifest_path`, and `backup_kind: "full"` (use this path for **`restore-profile-from-backup`** so every profile may appear in shards).
- `latest/latest-differential-backup.json` — updated on successful **differential** runs (`backup_kind: "differential"`). Do **not** use this alone for single-profile restore unless you know the profile row changed since the last full.
- Legacy monolith: `daily/YYYY-MM-DD/database-backup-YYYY-MM-DD.json.gz`; retention prunes by **calendar day** prefix under `daily/` or `differential/` (see env vars below).

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
| `BACKUP_KEEP_DIFFERENTIAL_DAYS` | `7` | Retention for **`differential/`** calendar-date folders (newest N dates kept). Pruning runs after **differential** backups only. |

**Metadata/logging:**
- `public.backup_runs` records status (`running` → `partial` while continuations run → `success|warning|failed`), bytes, table deltas, warnings, and errors; **`backup_kind`** (`full` \| `differential`) and **`incremental_base_completed_at`** (differential watermark). Requires migrations: `partial` status (`sql/migrations/20260508_backup_runs_checkpoint_status.sql`), differential columns (`sql/migrations/20260510_backup_runs_differential.sql`).

**Table discovery:**
- Uses `get_backup_tables()` to dynamically include new `public` tables (excludes cache/log/session tables, `backup_runs`, `bible_verses`, `scripture_access_logs`, `verification_codes`; apply **`sql/migrations/20260509_get_backup_tables_fix_log_exclusions.sql`** if an older migration still listed the wrong log table name and pulled full access logs into backups).

**Excluded from export (re-importable CCEL corpora):**
- `backup-to-storage` and `npm run backup` **skip** `profiles` rows with slugs `sg…`, `meMMDD`, `cv…`, `mh…`, `je…`, `jefow`/`jerea`/`jetog`, `lgal`, `ltbw` (and deprecated `luthergal`), `ppgr`, `aogr`, `bxrp`, `jryh`, `jrym`, `pkag`, `lbst`, `twcm`/`twbt`/`twbd`/`twdc`/`twlp`/`twtc`, plus `spurgeon_passage_index` rows for those profile ids. User-authored profiles and non-corpus index rows are still backed up.
- Manifest `metadata.excluded_reimportable_corpus` and `metadata.corpus_profile_count_excluded` record the policy.
- **`restore-profile-from-backup`** rejects corpus slugs with **400** (use import scripts instead).

| Corpus | Re-import (from `gospel-admin/`) |
|--------|----------------------------------|
| Spurgeon sermons | `npm run import-spurgeon` (+ gap scripts as needed) |
| Morning & Evening | `npm run import-morneve` |
| Calvin | `npm run import-calvin` |
| Matthew Henry | `npm run import-henry` |
| Edwards | `npm run import-edwards` |
| Luther Galatians | `npm run import-luther-galatians` |
| Luther Bondage of the Will | `npm run import-luther-bondage` |
| Pilgrim's Progress | `npm run import-pilgrim` |
| All of Grace | `npm run import-all-of-grace` |
| The Reformed Pastor (Baxter) | `npm run import-reformed-pastor` |
| Holiness (J.C. Ryle) | `npm run import-ryle-holiness` |
| Thoughts for Young Men (J.C. Ryle) | `npm run import-ryle-thoughts-for-young-men` |
| Edwards Freedom of the Will | `npm run import-edwards-freedom-of-will` |
| Edwards Religious Affections | `npm run import-edwards-religious-affections` |
| Edwards Treatise on Grace | `npm run import-edwards-treatise-on-grace` |
| Berkhof Systematic Theology | `npm run import-berkhof` |
| Thomas Watson (six books) | `npm run import-watson` |

**One-time purge of legacy bloated backups:**
1. Deploy updated `backup-to-storage` and `restore-profile-from-backup` Edge functions (deploy **`index.ts` only** from the dashboard, or use `supabase functions deploy` from the repo).
2. `cd gospel-admin && node scripts/purge-db-backups-bucket.js --dry-run` then run without `--dry-run` (needs `SUPABASE_SERVICE_KEY` in `.env.local`).
3. Trigger one **full** backup (`POST {}` to `backup-to-storage` or Sunday cron).
4. If Supabase **database size** stays high, run `VACUUM FULL storage.objects;` in the SQL Editor during low traffic (direct `DELETE` on `storage.objects` is blocked by Supabase; use the script or Storage API).

**Retention (free-tier guardrail):**
- Keep a short rolling window for **full** backups (recommended: 7): **`BACKUP_KEEP_DAILY`** prunes **`daily/`** date folders on successful **full** runs.
- Differential artifacts prune separately: **`BACKUP_KEEP_DIFFERENTIAL_DAYS`** applies to **`differential/`** on successful **differential** runs.

**Failure notifications:**
- On **failure** only (not `warning` or `success`), the function sends email via `send-email` to users who have `role='admin'` in `user_profiles`. Warnings are stored on `backup_runs` and in Edge logs—no email.

### Backup Schedule
- **Recommended**: Two **pg_cron** jobs (UTC — adjust for local Sunday if needed); see [`sql/migrations/20260512_backup_cron_differential.sql`](../gospel-admin/sql/migrations/20260512_backup_cron_differential.sql):
  - **Sunday** (full): `run_backup_to_storage_job(...)` → POST **`{}`** → `daily/<date>/<run_id>/`.
  - **Monday–Saturday** (differential): `run_backup_to_storage_differential_job(...)` → POST **`{"mode":"differential"}`** → `differential/<date>/<run_id>/`. Requires at least one successful **full** backup row in `backup_runs` first; otherwise the function returns **400**.
- **Legacy single daily job**: cron with `{}` only runs **full** backups (same as today).
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
