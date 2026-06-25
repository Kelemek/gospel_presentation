#!/usr/bin/env npx tsx
/**
 * Import Jay Adams Counselor's Topical Worklist scripture refs into the Biblical Counseling profile.
 *
 * Usage (from gospel-admin/):
 *   npm run import-jay-adams-topical-worklist -- --dry-run
 *   npm run import-jay-adams-topical-worklist
 *   npm run import-jay-adams-topical-worklist -- --slug 26b974ef
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { applyJayAdamsWorklistToGospelData } from '../src/lib/jayAdams/applyJayAdamsWorklist'
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
  console.log(`Sections before: ${gospelData.length}`)

  const summary = applyJayAdamsWorklistToGospelData(gospelData)

  console.log(`Sections after: ${gospelData.length}`)
  console.log(`Created ${summary.sectionsCreated.length} section(s):`)
  for (const title of summary.sectionsCreated) console.log(`  • ${title}`)

  console.log(`Updated ${summary.sectionsUpdated.length} section(s) with new scripture cards:`)
  for (const [title, count] of Object.entries(summary.refsAddedBySection).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`  • ${title}: +${count}`)
  }

  if (summary.unresolved.length > 0) {
    console.error('\nUnresolved worklist lines:')
    for (const line of summary.unresolved) console.error(`  • ${line}`)
    process.exit(1)
  }

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
