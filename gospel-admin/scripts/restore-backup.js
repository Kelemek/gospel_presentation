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

const INSERT_BATCH_SIZE = 500;

// Tables allowed for restore (must match get_backup_tables)
const ALLOWED_TABLES = new Set([
  'admin_settings', 'bible_verses', 'coma_templates', 'profile_access',
  'profiles', 'translation_settings', 'user_profiles'
]);

async function restoreBackup(backupFile) {
  try {
    console.log(`📥 Loading backup from: ${backupFile}`);
    
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    if (!backupData.tables) {
      throw new Error('Invalid backup file format');
    }
    
    console.log(`📅 Backup date: ${backupData.backup_date}`);
    console.log(`📊 Backup version: ${backupData.version || 'legacy'}`);
    console.log(`📋 Tables in backup: ${Object.keys(backupData.tables).join(', ')}`);
    
    // Confirm restoration
    console.log('\n⚠️  WARNING: This will DELETE all existing data and restore from backup!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get list of tables to restore from backup
    const tablesToRestore = Object.keys(backupData.tables);
    let restoredCount = 0;
    let skippedCount = 0;
    
    // Restore each table dynamically
    for (const tableName of tablesToRestore) {
      if (!ALLOWED_TABLES.has(tableName)) {
        console.warn(`⚠️  Skipping ${tableName} - not in restore whitelist`);
        skippedCount++;
        continue;
      }
      const records = backupData.tables[tableName];
      
      if (!Array.isArray(records)) {
        console.warn(`⚠️  Skipping ${tableName} - invalid data format`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n🔄 Restoring ${tableName} table (${records.length} records)...`);
      
      try {
        // Clear table: use truncate_backup_table RPC if available, else fallback delete
        const { error: truncateError } = await supabase.rpc('truncate_backup_table', { tname: tableName });
        if (truncateError) {
          const deleteQuery = tableName === 'bible_verses'
            ? supabase.from(tableName).delete().gte('id', 0)
            : supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const { error: deleteError } = await deleteQuery;
          if (deleteError) {
            console.warn(`   Warning clearing ${tableName}:`, deleteError.message);
          }
        }
        
        // Insert backup data in batches
        if (records.length > 0) {
          let inserted = 0;
          for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
            const batch = records.slice(i, i + INSERT_BATCH_SIZE);
            const { error: insertError } = await supabase.from(tableName).insert(batch);
            if (insertError) {
              throw new Error(insertError.message);
            }
            inserted += batch.length;
            if (records.length > INSERT_BATCH_SIZE) {
              process.stdout.write(`\r   Inserted ${inserted}/${records.length}...`);
            }
          }
          if (records.length > INSERT_BATCH_SIZE) process.stdout.write('\n');
          console.log(`   ✅ Restored ${records.length} records`);
          restoredCount++;
        } else {
          console.log(`   ℹ️  No records to restore`);
          restoredCount++;
        }
      } catch (tableError) {
        console.warn(`   ❌ Error restoring ${tableName}:`, tableError.message);
        skippedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Restore completed!`);
    console.log(`   - Tables restored: ${restoredCount}`);
    console.log(`   - Tables skipped: ${skippedCount}`);
    console.log('='.repeat(60) + '\n');
    
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
