#!/usr/bin/env npx tsx
/**
 * Sort top-level gospel_data sections alphabetically by title and renumber.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/sort-profile-sections-alpha.ts [--slug 26b974ef] [--dry-run]
 */
import dotenv from 'dotenv'

import { createClient } from '@supabase/supabase-js'

import { sortGospelSectionsAlphabetically } from '../src/lib/gospelDataSections'
import type { GospelSection } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const PROFILE_SLUG = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : '26b974ef'
const DRY_RUN = args.includes('--dry-run')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey)
  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, title, gospel_data')
    .eq('slug', PROFILE_SLUG)
    .single()

  if (error || !profile) {
    console.error('Profile not found:', PROFILE_SLUG, error)
    process.exit(1)
  }

  const gospelData = profile.gospel_data as GospelSection[]
  console.log(`Profile: ${profile.title} (${PROFILE_SLUG})`)
  console.log(`Sections before: ${gospelData.map((s) => s.title).join(' → ')}`)

  sortGospelSectionsAlphabetically(gospelData)

  console.log(`Sections after:  ${gospelData.map((s) => `${s.section}. ${s.title}`).join(' → ')}`)

  if (DRY_RUN) {
    console.log('\nDRY RUN — no database writes')
    return
  }

  const { error: updateErr } = await sb
    .from('profiles')
    .update({ gospel_data: gospelData })
    .eq('id', profile.id)

  if (updateErr) {
    console.error('Update failed:', updateErr)
    process.exit(1)
  }
  console.log('\nSaved gospel_data to Supabase.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
