#!/usr/bin/env npx tsx
/**
 * Create or refresh a test profile cloned from the Biblical Counseling Reference,
 * with the secular→biblical term map applied. Does not modify production (26b974ef).
 *
 * Usage (from gospel-admin/):
 *   npm run create-biblical-counseling-secular-map-test
 *   npm run create-biblical-counseling-secular-map-test -- --dry-run
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
} from '../src/lib/biblicalCounseling/biblicalCounselingReference'
import { applySecularTermMapToGospelData } from '../src/lib/biblicalCounseling/secularTermMap'
import { loadSecularTermMapFromSupabase } from '../src/lib/biblicalCounseling/secularTermMapDb'
import type { GospelSection } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

const TEST_TITLE = 'Biblical Counseling Scripture Reference (secular map test)'
const TEST_DESCRIPTION =
  'Test fork of the Biblical Counseling Scripture Reference with the secular→biblical topic mapping table. Not shown in Resources.'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const map = await loadSecularTermMapFromSupabase()
  const sb = createClient(supabaseUrl, supabaseServiceKey)

  const { data: source, error: sourceErr } = await sb
    .from('profiles')
    .select('title, gospel_data')
    .eq('slug', BIBLICAL_COUNSELING_REFERENCE_SLUG)
    .single()

  if (sourceErr || !source) {
    console.error('Source profile not found:', BIBLICAL_COUNSELING_REFERENCE_SLUG, sourceErr)
    process.exit(1)
  }

  const gospelData = JSON.parse(JSON.stringify(source.gospel_data)) as GospelSection[]
  console.log(`Source: ${source.title} (${BIBLICAL_COUNSELING_REFERENCE_SLUG})`)
  console.log(`Sections cloned: ${gospelData.length}`)

  const issues = applySecularTermMapToGospelData(gospelData, map)
  if (issues.length > 0) {
    console.warn('\nUnknown biblical topics (no matching section title):')
    for (const issue of issues) {
      console.warn(`  • ${issue.biblicalTopic}`)
    }
  }

  console.log(`\nTest profile slug: ${BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG}`)
  console.log(`Sections after map: ${gospelData.map((s) => `${s.section}. ${s.title}`).join(' → ')}`)

  const { data: existing } = await sb
    .from('profiles')
    .select('id, slug')
    .eq('slug', BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG)
    .maybeSingle()

  if (DRY_RUN) {
    console.log('\nDRY RUN — no database writes')
    console.log(existing ? 'Would update existing test profile.' : 'Would insert new test profile.')
    console.log(`Preview URL: /${BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG}/`)
    return
  }

  if (existing) {
    const { error: updateErr } = await sb
      .from('profiles')
      .update({
        title: TEST_TITLE,
        description: TEST_DESCRIPTION,
        gospel_data: gospelData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) {
      console.error('Update failed:', updateErr)
      process.exit(1)
    }
    console.log('\nRefreshed test profile gospel_data in Supabase.')
  } else {
    const { error: insertErr } = await sb.from('profiles').insert({
      slug: BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
      title: TEST_TITLE,
      description: TEST_DESCRIPTION,
      gospel_data: gospelData,
      is_template: false,
      is_default: false,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertErr) {
      console.error('Insert failed:', insertErr)
      process.exit(1)
    }
    console.log('\nCreated test profile in Supabase.')
  }

  console.log(`Open: /${BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
