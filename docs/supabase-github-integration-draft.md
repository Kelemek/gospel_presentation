# Supabase GitHub-integration draft (Gospel Presentation)

Project: `mchtyihbwlzjhkcmdvib` (`https://mchtyihbwlzjhkcmdvib.supabase.co`)
Repo: `Kelemek/gospel_presentation`

## Included in this draft

1. `config.toml` — project_id + `[functions.*]` for all five edge functions (required for deploy-on-push of functions).
2. `migrations/` — three history versions already recorded in `supabase_migrations.schema_migrations`, recovered from the live DB so GitHub migrate does not fail on "history entry with no file":
   - `20260303234757_physical_intimacy_rollback.sql`
   - `20260303235532_physical_intimacy_restructure_v2.sql`
   - `20260928190044_scripture_cache_woc_text.sql`
3. `migrations/20261026180000_baseline_public_schema.sql` — **full public-schema baseline** reconstructed via Supabase MCP (`describe_tables` + `execute_sql`), **not** `pg_dump` / CLI dump.

## How the baseline was produced

- Database password was available, but direct Postgres from the box (`pg_dump` / `psql`) timed out / was blocked.
- Schema was reconstructed from live catalog queries through the `user-supabase` MCP only.
- Baseline timestamp is **after** the latest applied history version (`20260928190044`) so production migration history stays append-only.
- Statements are idempotent (`CREATE IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` + recreate) so a cloned preview branch can run them safely as a no-op when objects already exist.

### Baseline contents (current live schema)

| Object | Count / notes |
|--------|----------------|
| Extensions | `uuid-ossp`, `pgcrypto`, `pg_net` (IF NOT EXISTS / ignore-if-present) |
| Enum | `public.user_role` (`admin`, `counselor`, `counselee`) |
| Tables | **13** — all listed below, with columns/defaults/nullability/PKs/CHECKs matching live |
| Sequence | `scripture_access_logs_id_seq` (owned by `scripture_access_logs.id`) |
| FKs | `profiles.created_by → auth.users`, `user_profiles.id → auth.users`, `spurgeon_passage_index.profile_id → profiles` |
| Indexes | **23** non-PK (including unique `pairing_sessions_code_unique`, GIN on `profiles.saved_answers`, partial indexes) |
| Functions | **17** app-owned public functions (incl. both `enforce_esv_cache_limit` overloads) |
| Triggers | `update_*_updated_at` on profiles / user_profiles / spurgeon_passage_index; `on_auth_user_created` on `auth.users` → `handle_new_user` |
| RLS | Enabled on all **13** tables |
| Policies | **27** policies (see note on sync tables) |
| Comments | Table + column comments present on live |
| Grants | `ALL` on tables/sequence + `EXECUTE` on public functions to `anon`, `authenticated`, `service_role` |

**Tables:** profiles, user_profiles, coma_templates, translation_settings, scripture_cache (includes `woc_text`), scripture_access_logs, admin_settings, verification_codes, spurgeon_passage_index, backup_runs, pairing_sessions, sync_key_entries, sync_pairing_claim_rate_limits.

**RLS note:** `pairing_sessions`, `sync_key_entries`, and `sync_pairing_claim_rate_limits` have RLS enabled but **no** policies — intentional; only `service_role` (bypasses RLS) can access them.

**Not included (by design / not reconstructable as DDL here):**

- Row data / seeds
- Storage buckets, edge function source, cron job schedules (`pg_cron` job definitions)
- Auth config, vault secrets, realtime publication details
- Exact per-role privilege nuances beyond the standard Supabase Data API grants above
- Extension internals

The three known `schema_migrations` statement blobs were pulled for verification; recovered files already match (including `CONTENT_TRUNCATED` in the rollback payload and the live `woc_text` migration SQL). Those files were **not** overwritten.

## Production repair (required before deploy-to-production)

On production the 13 tables already exist and the three history migrations are already applied. After this draft lands on `main` (or before enabling GitHub migrate against prod):

```bash
supabase migration repair 20261026180000 --status applied --project-ref mchtyihbwlzjhkcmdvib
```

That marks the baseline as applied **without running it**. Do **not** call `apply_migration` / do not re-run the three content migrations on prod.

Preview branches cloned from prod already have the live schema; if the new baseline file is not yet in history, running it is a safe no-op thanks to `IF NOT EXISTS` / `OR REPLACE`.

## Local `db reset` caveat

Because the baseline timestamp is **after** the three history files, a cold `supabase db reset` runs the content `UPDATE`/`ALTER` migrations first (tables missing → fail). Prefer:

- branching / dumping from prod, or
- temporarily ordering a bootstrap baseline before those versions for empty local DBs only.

## After merge / next steps for Mark

1. Review this draft (`config.toml`, four migration files, these notes).
2. Open a CloudAgent (or local) branch that copies draft → repo `supabase/` paths; open PR — **do not** enable GitHub deploy-to-production until repair is done.
3. On prod: `supabase migration repair 20261026180000 --status applied`.
4. Enable Supabase GitHub integration (migrate + functions deploy on push to main).
5. Future schema changes: add new timestamped migrations only (never rewrite the baseline).

## Note on physical_intimacy migrations

`20260303234757_physical_intimacy_rollback.sql` as stored in the DB contains the literal token `CONTENT_TRUNCATED` inside the JSON payload. The file matches history exactly so migrate file-checks pass; it is not a clean re-runnable content migration.
