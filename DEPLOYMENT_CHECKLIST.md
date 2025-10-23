# 🚀 Netlify Deployment Checklist

## Pre-deployment Checklist

- [ ] ESV API key is working locally
- [ ] All files are committed to git
- [ ] Repository is pushed to GitHub
- [ ] `.env` file is in `.gitignore` (✅ already configured)

## Netlify Deployment Steps

### 1. GitHub Repository
- [ ] Create GitHub repository
- [ ] Push all files except `.env` and `config.js`
- [ ] Verify `netlify.toml` is included

### 2. Netlify Setup  
- [ ] Login to [netlify.com](https://netlify.com)
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Connect to GitHub and select your repository
- [ ] Netlify auto-detects build settings from `netlify.toml`

### 3. Environment Variables
- [ ] Go to Site Settings → Environment Variables  
- [ ] Add `ESV_API_TOKEN` with your API key value
- [ ] Save settings

### 4. Deploy
- [ ] Click "Deploy site" 
- [ ] Wait for build to complete (~1-2 minutes)
- [ ] Test scripture references work on live site

## Post-deployment Verification

- [ ] Site loads correctly
- [ ] Table of contents navigation works
- [ ] Scripture references are clickable
- [ ] ESV API integration displays scripture text
- [ ] Modal opens and closes properly
- [ ] Site is responsive on mobile

## Custom Domain (Optional)
- [ ] Purchase domain
- [ ] Add domain in Netlify dashboard
- [ ] Update DNS nameservers
- [ ] Verify SSL certificate is active

## Performance Check
- [ ] Test site speed with [GTmetrix](https://gtmetrix.com)
- [ ] Verify CDN is working globally
- [ ] Check mobile performance

## Continuous Deployment
✅ **Automatic**: Any push to `main` branch triggers rebuild
✅ **Environment**: API key managed securely in Netlify
✅ **Builds**: `node build-config.js` generates config automatically

---

**🎉 Your gospel presentation will be live at: `https://your-site-name.netlify.app`**

Need help? See [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) for detailed instructions.