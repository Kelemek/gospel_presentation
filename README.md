# Gospel Presentation - Next.js Application

This is a Next.js application that displays "Presenting the Gospel in its Context" by Dr. Stuart Scott with integrated ESV API functionality and a powerful admin interface for content management.

## Features

### 📖 **Presentation Features**
- **Dynamic Content Management**: Content managed through secure admin interface
- **ESV API Integration**: Click any scripture reference to view the full text
- **Favorite Navigation**: Mark important scriptures as favorites and navigate between them
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Keyboard Navigation**: Arrow keys to navigate between favorite scriptures
- **Print Friendly**: Optimized for presentation and printing

### 🔐 **Admin Features**
- **Secure Authentication**: Session-based authentication with environment variables
- **Content Editing**: Edit sections, subsections, and scripture references
- **Scripture Favorites**: Mark important references for easy navigation during presentations
- **GitHub Integration**: Automatic saving to GitHub repository
- **Live Preview**: Changes reflected immediately in presentation

## Project Structure

- `gospel-admin/` - Next.js admin interface and presentation application
  - `src/app/` - Next.js app router pages
  - `src/components/` - React components
  - `src/lib/` - Utilities and data management
- `data/` - Gospel presentation data storage
- `scripts/` - Utility scripts

## Getting Started

### 1. **Install Dependencies**
```bash
cd gospel-admin
npm install
```

### 2. **Environment Setup**
Copy the environment template and configure your settings:
```bash
cd gospel-admin
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- `ADMIN_PASSWORD`: Secure password for admin access
- `ESV_API_TOKEN`: Your ESV API key from https://api.esv.org/
- `GITHUB_TOKEN`: Personal access token for GitHub integration

### 3. **Run the Application**
```bash
npm run dev
```

The application will be available at:
- **Presentation**: http://localhost:3000
- **Admin Interface**: http://localhost:3000/admin

## ESV API Integration

The application uses the ESV API (api.esv.org) to fetch scripture text when users click on scripture references:

- **Click to Read**: Click any scripture reference to view the full text in a modal
- **Favorite Navigation**: Use ← → buttons or arrow keys to navigate between favorite scriptures
- **Loading States**: Shows spinner while fetching data
- **Error Handling**: Graceful error handling with retry options
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

See [Netlify Deploy](docs/NETLIFY_DEPLOY.md) for detailed instructions.

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
- Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.

## Copyright & Attribution

For complete copyright information and usage terms, visit `/copyright` on your deployed site.

**ESV API Compliance:**
- Non-commercial ministry use only
- Dynamic scripture fetching (no local storage)
- Proper attribution and ESV.org linking
- Verse-by-verse requests within API limits