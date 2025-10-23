const fs = require('fs');
const path = require('path');

// Simple .env parser (avoiding external dependencies)
function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null; // .env file not found, will use process.env instead
    }
    
    const envContent = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
            }
        }
    });
    
    return env;
}

// Get environment variables from .env file or process.env (for Netlify)
function getEnvVars() {
    // Try to load from .env file first (local development)
    const envFromFile = parseEnvFile('.env');
    
    if (envFromFile) {
        console.log('🔧 Building config.js from .env file (local development)...');
        return envFromFile;
    } else {
        console.log('🔧 Building config.js from environment variables (Netlify/production)...');
        return process.env;
    }
}

// Build config.js from environment variables
function buildConfig() {
    const env = getEnvVars();
    
    if (!env.ESV_API_TOKEN || env.ESV_API_TOKEN === 'your_api_key_here') {
        console.error('❌ ESV_API_TOKEN not found or not configured');
        if (process.env.NETLIFY) {
            console.log('📝 For Netlify deployment:');
            console.log('   1. Go to your Netlify dashboard');
            console.log('   2. Navigate to Site Settings > Environment Variables');
            console.log('   3. Add ESV_API_TOKEN with your API key value');
            console.log('   4. Redeploy your site');
        } else {
            console.log('📝 For local development:');
            console.log('   1. Create .env file with: ESV_API_TOKEN=your_actual_token_here');
            console.log('   2. Run this script again');
        }
        process.exit(1);
    }
    
    const isProduction = process.env.NETLIFY || process.env.NODE_ENV === 'production';
    const buildSource = process.env.NETLIFY ? 'Netlify environment variables' : '.env file';
    
    const configContent = `// Auto-generated configuration file
// Generated from: ${buildSource}
// Build time: ${new Date().toISOString()}
// Environment: ${isProduction ? 'production' : 'development'}
// Do not edit manually - run build script to regenerate

const CONFIG = {
    // ESV API configuration
    ESV_API_TOKEN: '${env.ESV_API_TOKEN}',
    ESV_API_URL: 'https://api.esv.org/v3/passage/text/',
    
    // Environment detection
    IS_PRODUCTION: ${isProduction},
    IS_NETLIFY: ${!!process.env.NETLIFY},
    
    // CORS proxy (usually not needed in production)
    USE_CORS_PROXY: ${env.USE_CORS_PROXY || 'false'},
    CORS_PROXY_URL: '${env.CORS_PROXY_URL || 'https://cors-anywhere.herokuapp.com/'}',
    
    // Build info
    BUILD_TIME: '${new Date().toISOString()}',
    BUILD_SOURCE: '${buildSource}'
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
`;
    
    fs.writeFileSync('config.js', configContent);
    console.log('✅ config.js generated successfully!');
    console.log('🔒 Your API key is now configured and secure');
    console.log(`📍 Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`📦 Source: ${buildSource}`);
}

// Run the build
buildConfig();