#!/usr/bin/env node

/**
 * Restore database from backup file
 * Usage: node restore-backup.js <backup-file.json>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function restoreBackup(backupFile) {
  try {
    console.log(`📥 Loading backup from: ${backupFile}`);
    
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    if (!backupData.tables) {
      throw new Error('Invalid backup file format');
    }
    
    console.log(`📅 Backup date: ${backupData.backup_date}`);
    console.log(`📊 Tables to restore: ${Object.keys(backupData.tables).join(', ')}`);
    
    // Confirm restoration
    console.log('\n⚠️  WARNING: This will DELETE all existing data and restore from backup!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Restore profiles
    if (backupData.tables.profiles) {
      console.log(`\n🔄 Restoring profiles table (${backupData.tables.profiles.length} records)...`);
      
      // Delete existing profiles
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) console.warn('Warning deleting profiles:', deleteError.message);
      
      // Insert backup data
      if (backupData.tables.profiles.length > 0) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(backupData.tables.profiles);
        
        if (insertError) throw new Error(`Failed to restore profiles: ${insertError.message}`);
        console.log(`✅ Restored ${backupData.tables.profiles.length} profiles`);
      }
    }
    
    // Restore user_profiles
    if (backupData.tables.user_profiles) {
      console.log(`\n🔄 Restoring user_profiles table (${backupData.tables.user_profiles.length} records)...`);
      
      // Delete existing user profiles
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) console.warn('Warning deleting user_profiles:', deleteError.message);
      
      // Insert backup data
      if (backupData.tables.user_profiles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(backupData.tables.user_profiles);
        
        if (insertError) throw new Error(`Failed to restore user_profiles: ${insertError.message}`);
        console.log(`✅ Restored ${backupData.tables.user_profiles.length} user profiles`);
      }
    }
    
    // Restore profile_access (counselee access grants)
    if (backupData.tables.profile_access) {
      console.log(`\n🔄 Restoring profile_access table (${backupData.tables.profile_access.length} records)...`);
      
      // Delete existing access records
      const { error: deleteError } = await supabase
        .from('profile_access')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.warn('Warning deleting profile_access:', deleteError.message);
        console.log('   (Table may not exist yet - skipping)');
      } else {
        // Insert backup data
        if (backupData.tables.profile_access.length > 0) {
          const { error: insertError } = await supabase
            .from('profile_access')
            .insert(backupData.tables.profile_access);
          
          if (insertError) {
            console.warn(`Warning restoring profile_access: ${insertError.message}`);
          } else {
            console.log(`✅ Restored ${backupData.tables.profile_access.length} access records`);
          }
        }
      }
    }
    
    console.log('\n✅ Database restore completed successfully!');
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

// Get backup file from command line
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: node restore-backup.js <backup-file.json>');
  console.error('Example: node restore-backup.js ../backups/latest-backup.json');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Backup file not found: ${backupFile}`);
  process.exit(1);
}

restoreBackup(backupFile);
