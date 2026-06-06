#!/usr/bin/env npx tsx
/**
 * Sync ACBC external resource links on a profile's gospel_data.
 *
 * Usage (from gospel-admin/):
 *   npm run sync-acbc-links
 *   npm run sync-acbc-links -- --reconcile
 *   npm run sync-acbc-links -- --slug 26b974ef --dry-run
 *   npm run sync-acbc-links -- --missing-only
 *   npm run sync-acbc-links -- --only "Abuse,Church"
 *   npm run sync-acbc-links -- --skip-scripture
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import {
  syncAcbcExternalLinksOnGospelData,
  type AcbcSyncSectionResult,
} from '../src/lib/acbc/externalResourceLinksSync'
import type { GospelSection } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const PROFILE_SLUG = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : '26b974ef'
const DRY_RUN = args.includes('--dry-run')
const RECONCILE = args.includes('--reconcile') || args.includes('--force')
const MISSING_ONLY = args.includes('--missing-only')
const SKIP_SCRIPTURE = args.includes('--skip-scripture')
const ONLY_SECTIONS = args.includes('--only')
  ? args[args.indexOf('--only') + 1].split(',').map((s) => s.trim())
  : null

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

  console.log(`Profile: ${profile.title} (${PROFILE_SLUG})`)
  if (DRY_RUN) console.log('DRY RUN — no database writes\n')

  const gospelData = profile.gospel_data as GospelSection[]
  const summary = await syncAcbcExternalLinksOnGospelData(gospelData, {
    reconcile: RECONCILE,
    missingOnly: MISSING_ONLY,
    onlySections: ONLY_SECTIONS,
    syncScriptureRefs: !SKIP_SCRIPTURE,
  })

  if (!DRY_RUN) {
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

  printSummary(summary)
}

function printSummary(summary: AcbcSyncSectionResult[]) {
  const updated = summary.filter((r) => r.status === 'updated' || r.status === 'reconciled')
  console.log('\n=== Sections updated ===')
  for (const row of updated) {
    const delta =
      row.added !== undefined || row.removed !== undefined
        ? ` (+${row.added ?? 0} / -${row.removed ?? 0})`
        : ''
    const scripture =
      row.scriptureCount !== undefined ? `, ${row.scriptureCount} scripture cards` : ''
    console.log(`  ${row.title}: ${row.count} links${scripture}${delta}`)
  }

  const noMapping = summary.filter((r) => r.status === 'skipped (no mapping)')
  if (noMapping.length > 0) {
    console.log('\n=== Sections without mapping ===')
    for (const row of noMapping) {
      console.log(`  • ${row.title}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
