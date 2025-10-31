#!/usr/bin/env ts-node
/**
 * One-time migration script to move profiles from Netlify Blobs to Supabase
 * 
 * Prerequisites:
 * 1. Supabase project created
 * 2. Database schema setup (run SQL from SUPABASE_MIGRATION.md)
 * 3. Environment variables set in .env.local
 * 
 * Usage:
 *   npm run migrate-to-supabase
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/database.types'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

// Load environment variables
import dotenv from 'dotenv'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key to bypass RLS during migration
)

async function migrateProfiles() {
  console.log('🚀 Starting migration from Netlify Blobs to Supabase...\n')
  
  try {
    // Step 1: Fetch all profiles from Netlify (dynamic import)
    console.log('📦 Fetching profiles from Netlify Blobs...')
    const { getProfiles: getNetlifyProfiles } = await import('../src/lib/blob-data-service')
    const netlifyProfiles = await getNetlifyProfiles()
    console.log(`✅ Found ${netlifyProfiles.length} profiles to migrate\n`)
    
    if (netlifyProfiles.length === 0) {
      console.log('⚠️  No profiles found. Nothing to migrate.')
      return
    }
    
    // Step 2: Check if profiles already exist in Supabase
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('slug')
    
    if (checkError) {
      throw new Error(`Failed to check existing profiles: ${checkError.message}`)
    }
    
    const existingSlugs = new Set(existingProfiles?.map((p: any) => p.slug) || [])
    
    if (existingSlugs.size > 0) {
      console.log(`⚠️  Found ${existingSlugs.size} profiles already in Supabase`)
      console.log('   Existing profiles will be skipped.\n')
    }
    
    // Step 3: Migrate each profile
    let migrated = 0
    let skipped = 0
    let failed = 0
    
    for (const profile of netlifyProfiles) {
      if (existingSlugs.has(profile.slug)) {
        console.log(`⏭️  Skipping ${profile.slug} (already exists)`)
        skipped++
        continue
      }
      
      try {
        const profileData = {
          id: randomUUID(), // Generate new UUID instead of using old numeric ID
          slug: profile.slug,
          title: profile.title,
          description: profile.description || null,
          is_default: profile.isDefault,
          visit_count: profile.visitCount,
          gospel_data: profile.gospelData,
          last_viewed_scripture: profile.lastViewedScripture || null,
          created_at: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
          updated_at: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt,
          last_visited: profile.lastVisited 
            ? (profile.lastVisited instanceof Date ? profile.lastVisited.toISOString() : profile.lastVisited)
            : null,
          created_by: null
        }

        const { error: insertError } = await (supabase
          .from('profiles')
          .insert(profileData as any))
        
        if (insertError) {
          throw insertError
        }
        
        console.log(`✅ Migrated: ${profile.slug} (${profile.title})`)
        migrated++
      } catch (error: any) {
        console.error(`❌ Failed to migrate ${profile.slug}:`, error.message)
        failed++
      }
    }
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`✅ Successfully migrated: ${migrated}`)
    console.log(`⏭️  Skipped (existing):    ${skipped}`)
    console.log(`❌ Failed:               ${failed}`)
    console.log(`📦 Total profiles:       ${netlifyProfiles.length}`)
    console.log('='.repeat(60))
    
    if (failed > 0) {
      console.log('\n⚠️  Some profiles failed to migrate. Check errors above.')
      process.exit(1)
    }
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Create your first admin user in Supabase Auth dashboard')
    console.log('   2. Update their role to "admin" in user_profiles table')
    console.log('   3. Test login with admin credentials')
    console.log('   4. Update environment variables to use Supabase')
    console.log('   5. Deploy!')
    
  } catch (error: any) {
    console.error('\n💥 Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run migration
migrateProfiles()
