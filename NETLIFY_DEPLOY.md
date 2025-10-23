# Netlify Deployment Guide

## Quick Deploy to Netlify

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial gospel presentation site"
   git branch -M main
   git remote add origin https://github.com/yourusername/gospel-presentation.git
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com) and login
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   - Netlify will auto-detect the `netlify.toml` configuration

3. **Add Environment Variables**:
   - In Netlify dashboard: Site Settings → Environment Variables
   - Add variable: `ESV_API_TOKEN` with your API key value
   - Click "Deploy site"

### Option 2: Manual Deploy

1. **Build locally**:
   ```bash
   node build-config.js
   ```

2. **Deploy to Netlify**:
   - Drag and drop the entire folder to [netlify.com/drop](https://netlify.com/drop)
   - Or use Netlify CLI: `netlify deploy --prod`

## Environment Variables Setup

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ESV_API_TOKEN` | Your ESV API key | `abc123def456...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_CORS_PROXY` | Enable CORS proxy | `false` |
| `CORS_PROXY_URL` | CORS proxy URL | `https://cors-anywhere.herokuapp.com/` |

## Netlify Configuration

The `netlify.toml` file includes:

- ✅ **Build command**: `node build-config.js`
- ✅ **Environment detection**: Works in all Netlify contexts
- ✅ **Security headers**: XSS protection, content type sniffing prevention
- ✅ **Caching**: Optimized for static assets
- ✅ **Node.js version**: Specified for consistency

## Build Process

1. **Netlify runs**: `node build-config.js`
2. **Script reads**: Environment variables from Netlify
3. **Generates**: `config.js` with your API key
4. **Deploys**: Static site with working scripture references

## Custom Domain (Optional)

1. **Add domain** in Netlify dashboard
2. **Update DNS** with Netlify's nameservers
3. **SSL certificate** automatically provisioned

## Troubleshooting

### Build Fails
- Check that `ESV_API_TOKEN` is set in Netlify environment variables
- Verify Node.js version compatibility

### Scripture Not Loading
- Check browser console for API errors
- Verify ESV API key is valid and has proper permissions
- Check network tab for failed requests

### CORS Errors
- Usually not needed in production (Netlify handles CORS well)
- If needed, set `USE_CORS_PROXY=true` in environment variables

## Development vs Production

### Local Development
- Uses `.env` file
- CORS proxy might be needed
- Hot reloading with local server

### Netlify Production
- Uses Netlify environment variables  
- No CORS issues
- CDN acceleration and global deployment

## Performance

Netlify provides:
- 🚀 **Global CDN**: Fast loading worldwide
- ⚡ **Edge locations**: Reduced latency
- 🗜️ **Asset optimization**: Automatic compression
- 🔒 **HTTPS**: Secure connections everywhere

Your gospel presentation will load fast and be secure for users worldwide! 🌍