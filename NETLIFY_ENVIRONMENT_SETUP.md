# Netlify Environment Variables Setup

## Required for Blob Storage in Production

The application now automatically uses Netlify Blob storage in production when the proper environment variables are configured. If not configured, it will fall back to read-only mode.

### Environment Variables Needed

Add these to your Netlify site settings under "Site configuration" → "Environment variables":

1. **NETLIFY_SITE_ID**
   - Get from: Netlify site dashboard → Site settings → General → Site details
   - Example: `abc12345-def6-7890-ghij-klmnopqrstuv`

2. **NETLIFY_TOKEN**
   - Get from: Netlify user settings → Applications → Personal access tokens
   - Create new token with "Sites:read" and "Blobs:write" permissions
   - Example: `nfp_abc123def456...`

### How to Configure

1. **Get your Site ID:**
   - Go to your Netlify dashboard
   - Click on your site
   - Go to "Site settings" → "General"
   - Copy the "Site ID" from "Site details"

2. **Create a Personal Access Token:**
   - Go to your Netlify user settings: https://app.netlify.com/user/applications
   - Click "New access token"
   - Give it a name like "Gospel Presentation Blob Access"
   - Select scopes: `sites:read` and `blobs:write`
   - Copy the generated token

3. **Add Environment Variables:**
   - Go to your site → Site settings → Environment variables
   - Click "Add a variable"
   - Add `NETLIFY_SITE_ID` with your site ID
   - Add `NETLIFY_TOKEN` with your personal access token

### Verification

After adding the variables:
1. Deploy your site
2. Check the function logs for: `[data-service] Using: blob-storage`
3. Profile management should work without read-only errors

### Fallback Behavior

- **Development:** Always uses file storage
- **Production without blob vars:** Falls back to file storage (read-only)
- **Production with blob vars:** Uses Netlify Blobs (read/write)

This ensures the site always works, but requires environment variables for full functionality in production.