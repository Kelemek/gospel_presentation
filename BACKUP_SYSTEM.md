# Netlify Blobs Backup System

This repository includes GitHub Actions to automatically backup and restore Netlify Blobs data as GitHub artifacts.

## 🔧 Setup

### 1. Configure GitHub Secrets

You need to add these secrets to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

- **`NETLIFY_SITE_ID`**: Your Netlify site ID (found in Site settings → General → Site details)
- **`NETLIFY_TOKEN`**: A Netlify personal access token with blob access
  - Go to Netlify → User settings → Personal access tokens
  - Create a new token with "Blob storage" permissions

### 2. Verify Workflows

The following workflows are now available:

- **`backup-netlify-blobs.yml`**: Automatic backup system
- **`restore-netlify-blobs.yml`**: Manual restore system

## 📦 Backup System

### Automatic Backups

Backups run automatically:
- **Daily at 2 AM UTC** (scheduled)
- **After pushes to main branch** (optional - you can disable this)

### Manual Backups

You can trigger a backup manually:

1. Go to Actions → "Backup Netlify Blobs"
2. Click "Run workflow"
3. Optionally provide a custom backup name
4. Click "Run workflow"

### What Gets Backed Up

Each backup includes:
- All blob data from your Netlify site
- Individual JSON files for each blob
- Complete backup manifest with metadata
- Backup statistics and timestamps
- Compressed archive for easy download

## 🔄 Restore System

### How to Restore

⚠️ **WARNING**: Restoring will overwrite your current Netlify blob data!

1. Find the backup you want to restore from:
   - Go to Actions → find a successful "Backup Netlify Blobs" run
   - Note the Run ID (in the URL) and artifact name

2. Run the restore:
   - Go to Actions → "Restore Netlify Blobs from Backup"
   - Click "Run workflow"
   - Enter the Run ID and artifact name
   - Type "RESTORE" to confirm (safety measure)
   - Click "Run workflow"

### Example Restore Values

If you have a backup run with URL: `https://github.com/user/repo/actions/runs/1234567890`
- **Run ID**: `1234567890`
- **Artifact Name**: `netlify-blobs-20241024_120000` (check the artifacts section)

## 📊 Backup Contents

Each backup contains:

### Individual Files
```
backup/
├── profiles.json              # Individual blob files
├── profile-default.json
├── profile-youth.json
├── ...
├── backup-manifest.json       # Complete backup data
├── backup-metadata.json       # Statistics and info
└── restore-report.json        # (after restore only)
```

### Backup Manifest
```json
{
  "timestamp": "2024-10-24T12:00:00.000Z",
  "site_id": "your-site-id",
  "blob_count": 5,
  "blobs": {
    "profiles": {
      "key": "profiles",
      "etag": "abc123",
      "size": 1024,
      "data": { ... }
    }
  }
}
```

## 🛡️ Data Safety Features

### Multiple Formats
- Individual JSON files for easy inspection
- Complete manifest for bulk restore
- Compressed archives for efficient storage

### Retention Policy
- Artifacts kept for **90 days**
- You can download and store externally for longer retention

### Safety Measures
- Restore requires typing "RESTORE" to confirm
- All operations logged with detailed output
- Backup metadata committed to repository (optional)

## 🚀 Advanced Usage

### Download Backups Locally

1. Go to Actions → successful backup run
2. Scroll to "Artifacts" section
3. Download the backup you need
4. Extract and inspect the JSON files

### Backup to External Storage

You can modify the workflow to also upload to:
- AWS S3
- Google Drive
- Dropbox
- Other cloud storage

### Custom Backup Schedule

Edit `.github/workflows/backup-netlify-blobs.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 2 * * 1'    # Weekly on Monday at 2 AM
```

### Notification Setup

Add Slack/Discord/email notifications by adding steps like:

```yaml
- name: Notify on failure
  if: failure()
  # Add your notification service here
```

## 🔍 Troubleshooting

### Common Issues

1. **"Site ID not found"**
   - Check that `NETLIFY_SITE_ID` secret is correct
   - Verify the site exists and you have access

2. **"Access denied"**
   - Check that `NETLIFY_TOKEN` has blob permissions
   - Verify the token hasn't expired

3. **"No blobs found"**
   - This is normal if you haven't created any profiles yet
   - The backup will still run and create an empty manifest

4. **"Artifact not found" during restore**
   - Ensure the Run ID is correct
   - Check that the artifact name matches exactly
   - Artifacts may expire after 90 days

### Manual Backup Script

If you need to run locally:

```bash
cd gospel-admin
export NETLIFY_SITE_ID="your-site-id"
export NETLIFY_TOKEN="your-token"

# Create the backup script from the workflow
node backup-blobs.js
```

## 📈 Monitoring

### Check Backup Status
1. Go to Actions tab
2. Look for green checkmarks on "Backup Netlify Blobs" runs
3. Click into runs to see detailed logs

### Backup History
- All backup metadata is optionally committed to `.backup-logs/`
- You can track backup frequency and success rates
- Use `git log --oneline | grep "Backup metadata"` to see history

## 🔐 Security Notes

- Backup data contains your presentation content
- GitHub artifacts are private to your repository
- Consider the sensitivity of your data when setting retention periods
- Regularly rotate your Netlify access tokens

---

**Need help?** Check the Actions logs for detailed error messages, or refer to the Netlify Blobs documentation.