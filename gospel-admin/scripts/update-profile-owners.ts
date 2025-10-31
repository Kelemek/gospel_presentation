// Script to update profiles without owners to be owned by markdlarson@me.com
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateProfileOwners() {
  try {
    // Find the user ID for markdlarson@me.com
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }
    
    const targetUser = authUsers.users.find(u => u.email === 'markdlarson@me.com')
    
    if (!targetUser) {
      console.error('User markdlarson@me.com not found')
      return
    }
    
    console.log(`Found user: ${targetUser.email} (ID: ${targetUser.id})`)
    
    // Get profiles without owners
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, slug, title, created_by')
      .is('created_by', null)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('No profiles without owners found')
      return
    }
    
    console.log(`\nFound ${profiles.length} profile(s) without owners:`)
    profiles.forEach(p => {
      console.log(`  - ${p.slug}: "${p.title}"`)
    })
    
    // Update all profiles without owners
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ created_by: targetUser.id })
      .is('created_by', null)
      .select()
    
    if (updateError) {
      console.error('Error updating profiles:', updateError)
      return
    }
    
    console.log(`\n✓ Successfully updated ${updated?.length || 0} profile(s) to be owned by ${targetUser.email}`)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

updateProfileOwners()
