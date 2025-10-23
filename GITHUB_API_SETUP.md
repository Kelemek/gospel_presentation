# GitHub API Data Management Setup

## Overview

Your gospel presentation now uses GitHub API for data management, providing:
- ✅ **Version Control** - Every change creates a Git commit with full history
- ✅ **Data Ownership** - Your content lives in your own GitHub repository
- ✅ **Backup & Recovery** - All changes are automatically backed up
- ✅ **Audit Trail** - See exactly what changed, when, and track all edits
- ✅ **No Data Loss** - Content survives deployments and server changes

## Setting Up GitHub Personal Access Token

To enable full GitHub API functionality, you need to create a Personal Access Token:

### Step 1: Create the Token

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. Click "Generate new token" → "Generate new token (classic)"
3. Configure the token:
   - **Note**: "Gospel Presentation Admin"
   - **Expiration**: 90 days (or custom)
   - **Scopes**: Check `repo` (Full control of private repositories)

### Step 2: Add Token to Environment

1. Copy the generated token (save it securely - you won't see it again!)
2. Open your `.env.local` file in the gospel-admin directory
3. Replace `your_github_personal_access_token_here` with your actual token:

```bash
GITHUB_TOKEN=ghp_your_actual_token_here_1234567890abcdef
```

### Step 3: Restart Development Server

1. Stop your current dev server (Ctrl+C)
2. Restart with `npm run dev`
3. Your admin interface will now save directly to GitHub!

## How It Works

### Data Storage
- **Location**: `/data/gospel-presentation.json` in your repository
- **Format**: Clean JSON (no TypeScript code)
- **Management**: Via GitHub API with automatic commits

### Admin Interface Features
- **Individual Save Buttons**: Save changes per section/subsection
- **Automatic Commits**: Each save creates a meaningful commit message
- **Change Tracking**: Full Git history of all content changes
- **Error Handling**: Graceful fallbacks if GitHub API is unavailable

### Deployment Benefits
- **No Overwrites**: Content changes survive code deployments
- **Always Current**: Site always loads latest data from GitHub
- **Multiple Editors**: Multiple admins can edit content safely
- **Rollback Capability**: Can revert to any previous version

## Commit History API

You can also view the change history of your content:

```javascript
// Get last 10 commits for the gospel data
fetch('/api/commits?limit=10')
  .then(res => res.json())
  .then(commits => {
    commits.forEach(commit => {
      console.log(`${commit.date}: ${commit.message} by ${commit.author}`)
    })
  })
```

## Troubleshooting

### "GitHub token is required" Error
- Check that `GITHUB_TOKEN` is set in `.env.local`
- Restart your development server after adding the token
- Verify the token has `repo` permissions

### API Rate Limits
- GitHub allows 5,000 API requests per hour per token
- Your usage will be well within limits for content editing

### Token Expired
- GitHub tokens expire based on your selected timeframe
- Generate a new token and update `.env.local` when needed
- Consider using a longer expiration period

## Security Notes

- **Never commit** your `.env.local` file to Git
- **Store tokens securely** - treat them like passwords  
- **Use minimum permissions** - only `repo` scope is needed
- **Rotate tokens periodically** for security best practices

## Benefits Summary

| Feature | Before (File System) | After (GitHub API) |
|---------|---------------------|-------------------|
| **Data Persistence** | ❌ Lost on deployment | ✅ Survives all deployments |
| **Change History** | ❌ No tracking | ✅ Full Git commit history |
| **Backup** | ❌ Manual only | ✅ Automatic with Git |
| **Multiple Editors** | ❌ Conflicts likely | ✅ Safe concurrent editing |
| **Rollback** | ❌ Not possible | ✅ Revert to any version |
| **Audit Trail** | ❌ No visibility | ✅ Who changed what when |
| **Data Ownership** | ❌ Platform dependent | ✅ Your GitHub repository |

Your gospel presentation content is now fully under your control with professional-grade version management! 🎉