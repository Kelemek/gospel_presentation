#!/usr/bin/env npx tsx
/**
 * Add profile sections for ACBC topics not yet on the Biblical Counseling profile,
 * then reconcile external links from ACBC topic-index pages.
 *
 * Usage (from gospel-admin/):
 *   npm run add-acbc-sections
 *   npm run add-acbc-sections -- --dry-run
 *   npm run add-acbc-sections -- --slug 26b974ef --no-sync
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import {
  addMissingAcbcSections,
  syncAcbcExternalLinksOnGospelData,
} from '../src/lib/acbc/externalResourceLinksSync'
import type { GospelSection } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const PROFILE_SLUG = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : '26b974ef'
const DRY_RUN = args.includes('--dry-run')
const NO_SYNC = args.includes('--no-sync')

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
  const { added, skipped } = addMissingAcbcSections(gospelData)

  console.log(`Profile: ${profile.title} (${PROFILE_SLUG})`)
  console.log(`Added ${added.length} section(s):`)
  for (const t of added) console.log(`  • ${t}`)
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} (already present):`)
    for (const t of skipped) console.log(`  • ${t}`)
  }

  if (!NO_SYNC) {
    console.log('\nReconciling ACBC links for all mapped sections…')
    const summary = await syncAcbcExternalLinksOnGospelData(gospelData, { reconcile: true })
    const updated = summary.filter((r) => r.status === 'reconciled' || r.status === 'updated')
    console.log(`Updated links on ${updated.length} section(s).`)
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
