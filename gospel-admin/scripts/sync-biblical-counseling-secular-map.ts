#!/usr/bin/env npx tsx
/**
 * Sync secular→biblical term mapping as the pinned first section on the Biblical Counseling profile.
 *
 * Usage (from gospel-admin/):
 *   npm run sync-biblical-counseling-secular-map
 *   npm run sync-biblical-counseling-secular-map -- --dry-run
 *   npm run sync-biblical-counseling-secular-map -- --slug 26b974ef
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { BIBLICAL_COUNSELING_REFERENCE_SLUG } from '../src/lib/biblicalCounseling/biblicalCounselingReference'
import {
  applySecularTermMapToGospelData,
} from '../src/lib/biblicalCounseling/secularTermMap'
import { loadSecularTermMapFromSupabase } from '../src/lib/biblicalCounseling/secularTermMapDb'
import type { GospelSection } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const PROFILE_SLUG = args.includes('--slug')
  ? args[args.indexOf('--slug') + 1]
  : BIBLICAL_COUNSELING_REFERENCE_SLUG
const DRY_RUN = args.includes('--dry-run')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const map = await loadSecularTermMapFromSupabase()
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
  console.log(`Mapping section: ${map.pinnedSectionTitle}`)
  console.log(`Mappings: ${map.mappings.length}`)

  const issues = applySecularTermMapToGospelData(gospelData, map)
  if (issues.length > 0) {
    console.warn('\nUnknown biblical topics (no matching section title):')
    for (const issue of issues) {
      console.warn(`  • ${issue.biblicalTopic}`)
    }
  }

  console.log(`\nSections after sync: ${gospelData.map((s) => `${s.section}. ${s.title}`).join(' → ')}`)

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
