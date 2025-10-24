#!/bin/bash

# Test Netlify Blobs Backup Locally
# This script helps you test the backup functionality before relying on GitHub Actions

set -e

echo "🔧 Netlify Blobs Backup Test"
echo "============================="

# Check if we're in the right directory
if [ ! -f "gospel-admin/package.json" ]; then
    echo "❌ Please run this script from the root of your repository"
    echo "   (the directory containing the gospel-admin folder)"
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment variables..."

if [ -z "$NETLIFY_SITE_ID" ]; then
    echo "❌ NETLIFY_SITE_ID not set"
    echo "   Run: export NETLIFY_SITE_ID='your-site-id'"
    exit 1
fi

if [ -z "$NETLIFY_TOKEN" ]; then
    echo "❌ NETLIFY_TOKEN not set"
    echo "   Run: export NETLIFY_TOKEN='your-token'"
    exit 1
fi

echo "✅ Environment variables configured"
echo "   Site ID: ${NETLIFY_SITE_ID:0:8}..."
echo "   Token: ${NETLIFY_TOKEN:0:8}..."

# Setup
cd gospel-admin

echo ""
echo "📦 Installing dependencies..."
npm install > /dev/null 2>&1

echo "🔄 Creating test backup..."

# Create backup directory
mkdir -p ../test-backup

# Create package.json for ES module support
cat > package.json << 'EOF'
{
  "type": "module"
}
EOF

# Create the backup script with ES modules
cat > test-backup.mjs << 'EOF'
import { getStore } from '@netlify/blobs';
import { promises as fs } from 'fs';
import { join } from 'path';

async function testBackup() {
  try {
    console.log('🔄 Testing Netlify Blobs connection...');
    
    const store = getStore('gospel-data');
    
    // Test connection by listing blobs
    console.log('📋 Fetching blob list...');
    const { blobs } = await store.list();
    console.log(`✅ Connection successful! Found ${blobs.length} blobs`);
    
    if (blobs.length === 0) {
      console.log('ℹ️  No blobs found - this is normal if you haven\'t created profiles yet');
      return;
    }

    const backupDir = '../test-backup';
    
    const backupData = {
      test_timestamp: new Date().toISOString(),
      site_id: process.env.NETLIFY_SITE_ID,
      blob_count: blobs.length,
      blobs: {}
    };

    console.log('\n📦 Testing blob backup...');
    let successCount = 0;
    
    // Backup first few blobs as test
    const testBlobs = blobs.slice(0, Math.min(3, blobs.length));
    
    for (const blob of testBlobs) {
      try {
        console.log(`  📥 Testing: ${blob.key}`);
        const data = await store.get(blob.key, { type: 'json' });
        
        backupData.blobs[blob.key] = {
          key: blob.key,
          etag: blob.etag,
          size: blob.size,
          data: data
        };

        // Save test file
        const filename = `test_${blob.key.replace(/[\/\\:*?"<>|]/g, '_')}.json`;
        await fs.writeFile(
          join(backupDir, filename), 
          JSON.stringify(data, null, 2)
        );
        
        successCount++;
      } catch (error) {
        console.log(`  ❌ Error with ${blob.key}: ${error.message}`);
      }
    }

    // Save test manifest
    await fs.writeFile(
      join(backupDir, 'test-manifest.json'),
      JSON.stringify(backupData, null, 2)
    );

    console.log('\n✅ Test backup completed!');
    console.log(`📊 Results: ${successCount}/${testBlobs.length} blobs backed up successfully`);
    
    if (successCount === testBlobs.length) {
      console.log('🎉 All tests passed! Your backup system should work correctly.');
    } else {
      console.log('⚠️  Some issues detected - check the error messages above.');
    }
    
    console.log(`\n📁 Test files created in: test-backup/`);

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔐 Authentication issue:');
      console.log('   - Check that NETLIFY_TOKEN is correct');
      console.log('   - Ensure token has "Blob storage" permissions');
      console.log('   - Verify token hasn\'t expired');
    }
    
    if (error.message.includes('404') || error.message.includes('site')) {
      console.log('\n🏢 Site issue:');
      console.log('   - Check that NETLIFY_SITE_ID is correct');
      console.log('   - Ensure you have access to this site');
    }
    
    process.exit(1);
  }
}

testBackup();
EOF

# Run the test with ES module support
node test-backup.mjs

echo ""
echo "🔍 Test backup contents:"
if [ -d "../test-backup" ]; then
    ls -la ../test-backup/
    echo ""
    echo "📄 You can inspect the test files in the test-backup/ directory"
else
    echo "❌ No backup directory created"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. If the test passed, your GitHub Action should work"
echo "   2. Add the secrets to your GitHub repository:"
echo "      - NETLIFY_SITE_ID"
echo "      - NETLIFY_TOKEN"
echo "   3. The backup will run automatically daily at 2 AM UTC"
echo "   4. You can also trigger it manually from the Actions tab"

echo ""
echo "🧹 Cleanup: Run 'rm -rf test-backup/' when done testing"