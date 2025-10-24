# Netlify Blob Storage Configuration

This gospel presentation application now uses **Netlify Blob Storage exclusively** for data management. This provides:

✅ **Scalable Storage** - Automatic scaling with your Netlify deployment  
✅ **Fast Performance** - Edge-optimized data delivery worldwide  
✅ **Simplified Architecture** - Single data source, no fallbacks or confusion  
✅ **Production Ready** - Built for real-world deployment scenarios  

## Required Environment Variables

The application requires these Netlify credentials to function:

```bash
# Netlify Blob Storage Configuration (REQUIRED)
NETLIFY_SITE_ID=your_site_id_here
NETLIFY_TOKEN=your_personal_access_token_here
```

## How to Get Your Credentials

### 1. Get NETLIFY_SITE_ID
1. Go to your [Netlify dashboard](https://app.netlify.com/)
2. Select your site
3. Go to **Site settings** → **General** → **Site details**
4. Copy the **Site ID**

### 2. Get NETLIFY_TOKEN
1. Go to [Netlify user settings](https://app.netlify.com/user/applications)
2. Click **Applications** → **Personal access tokens**
3. Click **New access token**
4. Give it a name like "Gospel Presentation"
5. Set scopes: `sites:read` and `blobs:write`
6. Copy the generated token

## Data Architecture

The system now uses a clean, single-source architecture:

```
Profile System (Netlify Blobs)
├── profiles.json (metadata)
├── default profile content
├── custom profile content
└── favorites & customizations
```

**No GitHub API dependency** - The previous GitHub integration has been completely removed for simplicity.

## Development vs Production

- **Development**: Uses blob storage with credentials from `.env.local`
- **Production**: Uses blob storage with Netlify environment variables
- **No fallback systems** - Ensures consistent behavior across environments

## Benefits of This Approach

1. **Simplified Deployment** - No complex setup or API keys to manage
2. **Better Performance** - Direct blob access without API overhead  
3. **Easier Debugging** - Single data path to troubleshoot
4. **Scalable** - Automatically scales with your Netlify plan
5. **Reliable** - No dependency on external GitHub API limits

## Migration Note

All GitHub API routes (`/api/data`, `/api/commits`) have been removed. The system now routes everything through the profile system using Netlify Blob Storage.