// Script to add is_template column to profiles table and mark default as template
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

async function addTemplateColumn() {
  try {
    console.log('Adding is_template column to profiles table...')
    
    // Add the column via raw SQL
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
      `
    })
    
    if (alterError) {
      console.error('Error adding column (trying alternative method):', alterError)
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;')
      console.log('UPDATE profiles SET is_template = true WHERE is_default = true;')
      console.log('\nOr use the Supabase dashboard to add the column.')
    }
    
    // Mark default profile as template
    console.log('\nMarking default profile as template...')
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_template: true })
      .eq('is_default', true)
      .select()
    
    if (error) {
      console.error('Error updating default profile:', error)
      return
    }
    
    console.log(`✓ Successfully marked ${data?.length || 0} profile(s) as template`)
    if (data && data.length > 0) {
      data.forEach(p => {
        console.log(`  - ${p.slug}: "${p.title}"`)
      })
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

addTemplateColumn()
