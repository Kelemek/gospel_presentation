#!/usr/bin/env node

/**
 * Manual database backup script
 * Creates a timestamped backup of the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const { isReimportableCorpusProfileSlug } = require('./lib/reimportableCorpusProfileSlug');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createBackup() {
  try {
    console.log('📦 Creating database backup...\n');
    
    // Create backups directory
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dateOnly = new Date().toISOString().split('T')[0];
    
    // Backup profiles table
    console.log('📊 Fetching profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;
    const profilesForBackup = profiles.filter((p) => !isReimportableCorpusProfileSlug(p.slug ?? ''));
    const corpusExcluded = profiles.length - profilesForBackup.length;
    console.log(
      `   ✅ Found ${profiles.length} profiles (${profilesForBackup.length} in backup; ${corpusExcluded} CCEL corpus excluded)`
    );
    
    // Backup user_profiles table
    console.log('📊 Fetching user_profiles...');
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (userProfilesError) throw userProfilesError;
    console.log(`   ✅ Found ${userProfiles.length} user profiles`);
    
    // Create backup object
    const backup = {
      backup_date: new Date().toISOString(),
      backup_type: 'manual',
      version: '1.2',
      tables: {
        profiles: profilesForBackup,
        user_profiles: userProfiles,
      },
      metadata: {
        total_records: profilesForBackup.length + userProfiles.length,
        tables_count: 2,
        excluded_reimportable_corpus: true,
        corpus_profiles_excluded: corpusExcluded,
      }
    };
    
    // Write timestamped backup file
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup saved: ${filename}`);
    
    // Also update latest backup
    const latestPath = path.join(backupDir, 'latest-backup.json');
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));
    console.log(`💾 Updated: latest-backup.json`);
    
    // Create individual profile backups
    const profilesDir = path.join(backupDir, 'profiles', dateOnly);
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    
    userProfiles.forEach(profile => {
      const profileBackup = {
        profile: profile,
        backup: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Manual Backup Script',
          version: '1.0'
        }
      };
      
      const profileFile = `gospel-profile-${profile.slug}-backup-${dateOnly}.json`;
      fs.writeFileSync(
        path.join(profilesDir, profileFile),
        JSON.stringify(profileBackup, null, 2)
      );
    });
    
    if (userProfiles.length > 0) {
      console.log(`💾 Individual profile backups: ${profilesDir}`);
    }
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   Profiles (backed up): ${profilesForBackup.length}`);
    console.log(`   CCEL corpus excluded: ${corpusExcluded}`);
    console.log(`   User Profiles: ${userProfiles.length}`);
    console.log(`   Total Records: ${backup.metadata.total_records}`);
    console.log(`\n📂 Location: ${backupDir}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

createBackup();
