#!/bin/bash

# Setup script for ESV API configuration using .env approach

echo "🔧 Setting up ESV API configuration with .env file..."
echo ""

# Check if .env already exists and has API key
if [ -f ".env" ]; then
    if grep -q "ESV_API_TOKEN=.*[^your_api_key_here]" .env 2>/dev/null; then
        echo "✅ .env file already configured with API key"
        echo "🔄 Regenerating config.js..."
        node build-config.js
        echo "Setup complete! 🎉"
        exit 0
    else
        echo "⚠️  .env file exists but API key not configured"
    fi
else
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# ESV API Configuration
# Get your free API key from https://api.esv.org/account/create-application/
ESV_API_TOKEN=your_api_key_here

# Optional: CORS proxy for local development (set to true if needed)
USE_CORS_PROXY=false
CORS_PROXY_URL=https://cors-anywhere.herokuapp.com/
EOF
    echo "✅ Created .env file"
fi

echo ""
echo "📝 Next steps:"
echo "1. Go to https://api.esv.org/account/create-application/"
echo "2. Create a free account and application"
echo "3. Copy your API token"
echo "4. Edit .env file and replace 'your_api_key_here' with your token"
echo "5. Run: node build-config.js"
echo "6. Open index.html in your browser"
echo ""
echo "🔗 Direct link to get API key: https://api.esv.org/account/create-application/"
echo ""

# Try to open the API registration page
if command -v open &> /dev/null; then
    read -p "Would you like to open the ESV API registration page now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://api.esv.org/account/create-application/"
    fi
fi

echo ""
echo "💡 Pro tip: After adding your API key to .env, run 'node build-config.js' to generate config.js"
echo "Setup template complete! 🎉"