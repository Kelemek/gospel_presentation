# Infrastructure & Deployment

Database setup, security, and deployment information.

## Supabase Database

Complete migration from Netlify + Simple Auth to Supabase PostgreSQL with multi-user authentication.

### Key Tables
- **auth.users** - Authentication users (Supabase managed)
- **user_profiles** - User metadata (role, username, etc.)
- **profiles** - Gospel presentation resources
- **profile_access** - Legacy table (may still exist in older databases; cleared by `gospel-admin/sql/migrations/20260514_admin_only_staff_remove_profile_assignment.sql` when moving to admin-only staff)
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
2. For one profile: invoke `restore-profile-from-backup` with manifest path + slug or id
3. For full disaster recovery: plan outside this repo (hosted backups, point-in-time recovery, or custom tooling)

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
