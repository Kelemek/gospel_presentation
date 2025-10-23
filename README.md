# Gospel Presentation Website with ESV API Integration

This website displays "Presenting the Gospel in its Context" by Dr. Stuart Scott with integrated ESV API functionality for scripture references.

## Features

- **Dynamic Content Loading**: All content is loaded from `data.js` array
- **ESV API Integration**: Click any scripture reference to view the full text
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessible Navigation**: Keyboard navigation and screen reader friendly
- **Print Friendly**: Optimized print styles
- **Search Functionality**: Basic text search capability

## Files Structure

- `index.html` - Main HTML structure
- `styles.css` - Complete styling including modal and responsive design
- `script.js` - JavaScript functionality including ESV API integration
- `data.js` - Gospel presentation data as array of objects

## ESV API Integration

The website uses the ESV API (api.esv.org) to fetch scripture text when users click on scripture references. Features include:

- **Click to Read**: Click any green scripture reference badge to view the full text
- **Modal Display**: Scripture appears in an elegant modal overlay
- **Loading States**: Shows spinner while fetching data
- **Error Handling**: Graceful error handling with retry option
- **Formatted Text**: Proper verse numbering and paragraph formatting

### API Configuration

**⚠️ IMPORTANT**: You need to set up your own ESV API key for scripture loading to work.

This project now uses **proper .env configuration** for security and best practices!

#### Quick Setup:
1. Run the setup script: `./setup.sh` (creates .env template)
2. Go to https://api.esv.org/account/create-application/
3. Create a free account and application  
4. Copy your API token
5. Edit `.env` and replace `your_api_key_here` with your actual token
6. Run `node build-config.js` to generate config.js
7. Open index.html in your browser

#### Manual Setup:
1. Create `.env` file with: `ESV_API_TOKEN=your_actual_token_here`
2. Get your API key from https://api.esv.org/account/create-application/
3. Run `node build-config.js` to generate the browser-compatible config
4. Open index.html

#### Development Workflow:
```bash
# Install and setup
./setup.sh                # Creates .env template
# Edit .env with your API key
node build-config.js      # Generates config.js from .env
```

#### Why .env + build script?
- ✅ **Security**: .env files are industry standard for API keys
- ✅ **Gitignored**: Your API key stays local and secure  
- ✅ **Environment-specific**: Different keys for dev/prod
- ✅ **Browser-compatible**: Build script creates the needed config.js

#### Troubleshooting:
- If you get CORS errors in local development, set `USE_CORS_PROXY=true` in .env
- Make sure your API key is valid and has proper permissions
- Run `node build-config.js` after changing .env
- Check the browser console for detailed error messages

## Deployment

### 🚀 Deploy to Netlify (Recommended)

This site is optimized for Netlify deployment with automatic builds and environment variable support.

**Quick Deploy:**
1. Push to GitHub
2. Connect repository to Netlify  
3. Add `ESV_API_TOKEN` environment variable in Netlify dashboard
4. Deploy automatically builds and configures everything!

See [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) for detailed instructions.

### 🏠 Local Usage

1. Set up API key: Edit `.env` with your ESV API token
2. Build config: `node build-config.js`
3. Serve locally: `python3 -m http.server 8000`
4. Navigate through the gospel presentation sections
5. Click on any scripture reference (green badges) to read the full text
6. Use the table of contents for quick navigation
7. Press 'T' key to focus on table of contents

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled for dynamic content and API integration
- Internet connection required for scripture text fetching

## Customization

- Edit `data.js` to modify content structure
- Update `styles.css` to change appearance
- Modify `script.js` to add new functionality

## Credits

- Content by Dr. Stuart Scott
- ESV API by Crossway
- Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®)