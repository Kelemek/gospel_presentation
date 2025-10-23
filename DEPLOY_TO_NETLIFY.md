# One-Click Deploy to Netlify

Deploy this gospel presentation site to Netlify with one click!

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/gospel-presentation)

## What happens when you click deploy:

1. 🔗 **Fork Repository**: Creates a copy in your GitHub account
2. 🔑 **Environment Setup**: Prompts for ESV API token  
3. 🏗️ **Auto Build**: Runs build process with your API key
4. 🚀 **Live Site**: Deploys your gospel presentation site
5. 🔄 **Continuous Deployment**: Future commits auto-deploy

## After deployment:

1. ✅ **Get ESV API Key**: https://api.esv.org/account/create-application/
2. ✅ **Add to Netlify**: Site Settings → Environment Variables → Add `ESV_API_TOKEN`
3. ✅ **Redeploy**: Trigger new build with API key
4. ✅ **Test**: Click scripture references to verify they work

## Environment Variables Needed:

| Variable | Required | Description |
|----------|----------|-------------|
| `ESV_API_TOKEN` | ✅ Yes | Your ESV API key from api.esv.org |
| `USE_CORS_PROXY` | ❌ Optional | Set to `true` if CORS issues (usually not needed) |

---

**Need the API key first?** Get it here: https://api.esv.org/account/create-application/

**Want to customize first?** Fork the repository and modify before deploying.