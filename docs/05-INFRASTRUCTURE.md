# Infrastructure & Deployment

Database setup, security, and deployment information.

## Supabase Database

Complete migration from Netlify + Simple Auth to Supabase PostgreSQL with multi-user authentication.

### Key Tables
- **auth.users** - Authentication users (Supabase managed)
- **user_profiles** - User metadata (role, username, etc.)
- **profiles** - Gospel presentation resources
- **user_answers** - Stored user responses
- **coma_templates** - COMA method templates
- **bible_verses** - Optional bulk verse storage (import scripts only; not used by `/api/scripture`). Drop when unused: `gospel-admin/sql/migrations/20260515_drop_bible_verses_table.sql`
- **scripture_cache** - ESV API response cache

### Row-Level Security (RLS)
Tables use RLS appropriate to their sensitivity (see Supabase **Policies** and `gospel-admin/sql/` migrations). In general:

- Gospel **presentation** pages can be public for many profiles (see `allow_public_all_profiles` and related migrations).
- **Admin** operations in the app are enforced in API routes and UI by checking `user_profiles.role === 'admin'`.
- Historical scripts may still mention legacy roles; the live app expects **admin-only** staff for privileged routes.

**Setup**: See [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md)

## Security Guidelines

### Core Security Features
- Row-Level Security on all data tables
- Magic link authentication (no passwords)
- Session management with expiry
- User role-based access control
- Admin-only operations protected
- Service role key for admin operations

### Best Practices
- Never commit `.env.local` with real keys
- Use environment variables for all secrets
- Verify user role before operations
- Check RLS policies regularly
- Monitor Supabase logs for unauthorized access

### Database Access Control
- Anonymous users: Read-only public profiles
- Authenticated users: Role-based via RLS
- Admins: Use service role key for server operations
- All client operations: User's current session

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Build successful
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Supabase RLS policies verified

### Production Setup
- [ ] Supabase production project created
- [ ] Custom SMTP configured (email)
- [ ] Magic link redirect URLs added
- [ ] Environment variables deployed
- [ ] Backup system tested
- [ ] Monitoring configured

### Post-Deployment Verification
- [ ] Health checks passing
- [ ] User authentication working
- [ ] Email invitations functional
- [ ] Scripture lookups working
- [ ] Admin features accessible

## Monitoring (free tier)

Observability uses **PostHog Cloud (free)** for errors, session replay, heatmaps, and traffic/geo analytics. **Sentry** and **Microsoft Clarity** are not used.

| Tool | Role |
|------|------|
| **PostHog** | Client errors, session replay (sampled), product analytics, page views, geo |

### Environment variables

Set in Vercel (and `gospel-admin/.env.local` for local dev with live analytics):

- `NEXT_PUBLIC_POSTHOG_KEY` — project API key from PostHog project settings
- `NEXT_PUBLIC_POSTHOG_HOST` — ingest API host (optional; defaults to **`https://g.cp-church.org`**, a reverse proxy to PostHog Cloud so events are less likely to be blocked by ad blockers)

Set both in Vercel production/preview and in `gospel-admin/.env.local` for local dev with live analytics.

If these are unset, PostHog does not initialize (safe for CI and local test runs).

Client init uses Next.js [`instrumentation-client.ts`](../gospel-admin/instrumentation-client.ts) (supported since Next.js 15.3; not `instrumentation.ts`, which is server-only). [`PostHogProvider`](../gospel-admin/src/components/PostHogProvider.tsx) calls the same idempotent init on mount as a fallback.

### Custom events: modal opens

Modals do not change the URL, so they are **not** tracked as Web Analytics paths. Feature modals fire a custom **`modal_opened`** event via [`posthog-analytics.ts`](../gospel-admin/src/lib/posthog-analytics.ts) and [`usePostHogModalOpen`](../gospel-admin/src/hooks/usePostHogModalOpen.ts) (edge-triggered on open; no-op when PostHog is unset).

| `modal` property | Surface |
|------------------|---------|
| `scripture` | Scripture reader |
| `study` | Study resources (Spurgeon, Calvin, Henry, Edwards) |
| `coma` | COMA method |
| `four_rules` | Four rules of communication |
| `memorize_practice` | Memorization practice session |
| `memorize_add_bible_books` | Add Bible books to memorize |
| `bible_passage_picker` | Passage picker (`variant`: `memorize` or `reader`) |
| `scripture_word_study` | Word study overlay in scripture reader |
| `mcheyne_reading_plan` | M'Cheyne reading plan calendar |
| `morneve_devotions` | Morning & Evening devotions calendar |
| `github_feedback` | Feedback form |
| `presentation_welcome` | First-visit welcome |
| `memorize_listen_controls` | Memorize listen controls (modal presentation only) |

Optional properties: `profile_slug`, `reference`, `library_focus`, `memorization_kind`.

**Not tracked:** scripture hover previews (`ScriptureHoverModal`) and system alert/confirm dialogs (`AlertModalContext`) — low product signal and/or noisy volume.

Analyze in PostHog **Trends** or **Activity** filtered on event `modal_opened`, broken down by `modal`.

### Free-tier limits and configuration

- **Session replay:** 5,000 web recordings/month (hard cap; deleting replays does not free quota). Client init samples ~15% of sessions in [`posthog-config.ts`](../gospel-admin/src/lib/posthog-config.ts); adjust `POSTHOG_SESSION_RECORDING_SAMPLE_RATE` or use PostHog project sampling if traffic grows.
- **Analytics events:** 1M events/month, 1-year retention on free plan.
- **Error tracking:** 100k exceptions/month.
- **PostHog AI:** 2,000 credits/month (optional NL replay search / summaries).

Replay masks form inputs in the browser (not general page text). See the copyright page for user-facing disclosure.

### Verification after deploy

1. Browse the site — confirm events in PostHog (Activity / Web analytics).
2. Trigger a test client error — confirm in PostHog Error tracking.
3. Confirm a sampled session replay appears (may take a few minutes).
4. In browser devtools Network tab, confirm no requests to `sentry.io` or `clarity.ms`.

## Backups & Recovery

### Manual Backup
```bash
cd gospel-admin
node scripts/backup-database.js
```

### Restore (Supabase)
Full-database restore from monolithic JSON is not a supported CLI path. Use **`restore-profile-from-backup`** Edge Function for a **single profile** from Storage (see [backups/README.md](../backups/README.md)). Broader recovery: download shards from Storage / use Supabase backups and migrations as appropriate.

### Recovery Steps
1. Confirm latest automated run in `public.backup_runs` and Storage `db-backups`. For **`restore-profile-from-backup`**, use a manifest from a **full** backup (`latest/latest-backup.json` points at full runs; differential-only manifests omit unchanged rows).
2. For one **user or template** profile: invoke `restore-profile-from-backup` with manifest path + slug or id (not CCEL corpus slugs — those are excluded from backups).
3. For **CCEL corpora** (Spurgeon, Calvin, Henry, Morning & Evening, Edwards, Luther Galatians): re-import from `gospel-admin/` (`npm run import-spurgeon`, `import-calvin`, `import-henry`, `import-morneve`, `import-edwards`, `import-luther-galatians`).
4. For full disaster recovery: plan outside this repo (hosted backups, point-in-time recovery, or custom tooling).

### Reclaiming backup storage (Free tier)
After deploying corpus-exclusion backups, purge legacy shards: `npm run purge-db-backups -- --dry-run` then `npm run purge-db-backups` (requires `SUPABASE_SERVICE_KEY`; may take a while for ~100k+ objects). Deploy Edge functions, run one full `backup-to-storage` (`POST {}`), and `VACUUM FULL storage.objects;` in SQL Editor if database size stays high.

### Scheduled ACBC external link sync

Keeps the Biblical Counseling profile (default slug `26b974ef`) `externalResourceLinks` aligned with ACBC topic-index pages (adds new resources, removes stale URLs when run with reconcile).

| Mechanism | Setup |
|-----------|--------|
| **GitHub Actions** | [`.github/workflows/sync-acbc-external-links.yml`](../.github/workflows/sync-acbc-external-links.yml) — weekly Sunday 06:00 UTC runs `npm run sync-acbc-links -- --reconcile` on profile **`26b974ef`** (default in sync scripts). Repo secrets: **`SUPABASE_URL`**, **`SUPABASE_SERVICE_KEY`** (same as verification-code cleanup). Manual run: Actions → *Sync ACBC external links* → *reconcile* or *add-sections*. |
| **Manual** | `cd gospel-admin && npm run sync-acbc-links -- --reconcile` or `npm run add-acbc-sections` |

## Testing

**Status**: 476 tests passing, 28 skipped, 0 failures

### Run Tests
```bash
cd gospel-admin
npm test
```

### Test Coverage
- React components
- API routes and endpoints
- User interactions
- Admin functionality
- Authentication flows

## Related Documentation
- Full Supabase setup: [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md)
- Security policies: [SECURITY.md](SECURITY.md)
- KJV database: [KJV_DATABASE.md](KJV_DATABASE.md)
- Testing: [TEST_SUITE_README.md](TEST_SUITE_README.md)
