# Database Backup System

This directory contains manual backups of the Supabase database. Automated backups are stored as GitHub Actions artifacts.

## Quick Start

### Create a Manual Backup
```bash
cd gospel-admin
npm run backup
```

### Restore from Backup
```bash
cd gospel-admin
npm run restore ../backups/latest-backup.json
```

## Automated Backups

### GitHub Actions
The system includes a GitHub Actions workflow that automatically backs up the database daily at 2 AM UTC. Backups are stored as artifacts (not in the repository).

**Setup:**
1. Go to your GitHub repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon/public key

**Download Automated Backups:**
1. Go to GitHub Actions tab
2. Click on a successful "Backup Supabase Database" workflow run
3. Download the "database-backup-XXXX" artifact
4. Extract the ZIP file to get backup JSON files

**Artifact Retention:**
- Artifacts are kept for 90 days
- After 90 days, old backups are automatically deleted
- Download important backups before they expire

**Manual Trigger:**
- Go to Actions tab → "Backup Supabase Database" → Run workflow

### Backup Schedule
- **Automated**: Daily at 2 AM UTC (stored as artifacts)
- **Manual**: Run anytime with `npm run backup` (stored locally)
- **On-demand**: Trigger GitHub Action manually (stored as artifacts)

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

## Restore Process

### Full Database Restore
```bash
# Restore from latest backup
npm run restore ../backups/latest-backup.json

# Restore from specific backup
npm run restore ../backups/database-backup-2025-10-31.json
```

**⚠️ WARNING**: Restore will DELETE all existing data and replace it with backup data. You have a 5-second window to cancel (Ctrl+C).

### Individual Profile Restore
Use the admin interface:
1. Go to `/admin`
2. Find the profile you want to restore
3. Click "Restore from Backup"
4. Select the profile backup file from `backups/profiles/YYYY-MM-DD/`

## Best Practices

### Regular Backups
- Run manual backup before major changes: `npm run backup`
- GitHub Actions handles daily automated backups
- Keep important backups in multiple locations

### Version Control
- Backup files are committed to Git for version history
- Each backup includes timestamp and metadata
- Easy to restore to any previous state

### Recovery Scenarios

**Lost all user profiles:**
```bash
npm run restore ../backups/latest-backup.json
```

**Lost single profile:**
1. Use admin interface restore feature
2. Select profile backup from `backups/profiles/`

**Database corrupted:**
1. Check latest backup: `cat backups/latest-backup.json`
2. Verify it has your data
3. Run restore: `npm run restore ../backups/latest-backup.json`

## Backup Storage

### GitHub Actions Artifacts
- Automated backups stored as artifacts (90-day retention)
- Download from Actions tab → Workflow run → Artifacts section
- Does not bloat Git repository
- Compressed ZIP format

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
- Download important artifacts before 90-day expiration

## Troubleshooting

### Backup fails
- Check Supabase credentials in `.env.local`
- Verify network connection
- Check Supabase service status

### Restore fails
- Ensure you're using service role key (not anon key) for restore
- Check backup file format is valid JSON
- Verify Supabase connection

### GitHub Actions fails
- Check repository secrets are set correctly
- Verify workflow permissions
- Check Actions tab for error logs

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

### restore-backup.js
Restore database from backup file.

**Usage:**
```bash
node scripts/restore-backup.js <backup-file.json>
```

**Requirements:**
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Valid backup file

## Environment Variables

Required in `.env.local`:

```env
# For backups (read-only)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For restore (write access)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Support

For issues or questions:
1. Check backup file exists and is valid JSON
2. Verify environment variables are set
3. Check Supabase dashboard for any service issues
4. Review recent Git commits for backup history
