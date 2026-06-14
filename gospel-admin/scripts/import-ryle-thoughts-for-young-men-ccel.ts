/**
 * Import J.C. Ryle CCEL *Thoughts for Young Men* into Supabase (`jrym` profile).
 *
 * Source: Chapter XIX of `ryle/upper_room.xml` on CCEL.
 *
 * Usage (from gospel-admin/):
 *   npm run import-ryle-thoughts-for-young-men -- --parse-only
 *   npm run import-ryle-thoughts-for-young-men -- --dry-run
 *   npm run import-ryle-thoughts-for-young-men
 *   npm run import-ryle-thoughts-for-young-men -- --purge-jrym
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_RYLE_UPPER_ROOM_XML_URL,
  parseCcelRyleThoughtsForYoungMenXml,
} from '../src/lib/ryleThoughtsForYoungMen/ccelRyleThoughtsForYoungMenHtml'
import { importRyleThoughtsForYoungMenToSupabase } from '../src/lib/ryleThoughtsForYoungMen/importRyleThoughtsForYoungMenToSupabase'
import { RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG } from '../src/lib/ryleThoughtsForYoungMen/ryleThoughtsForYoungMenSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeJrym = false
  let url = process.env.CCEL_RYLE_UPPER_ROOM_URL || CCEL_RYLE_UPPER_ROOM_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-jrym') {
      purgeJrym = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeJrym, url }
}

async function purgeRyleThoughtsForYoungMenProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG} to purge.`)
    return
  }

  const { error: idxErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profile.id)
  if (idxErr) {
    throw new Error(`Delete index: ${JSON.stringify(idxErr)}`)
  }

  const { error: delErr } = await supabase.from('profiles').delete().eq('id', profile.id)
  if (delErr) {
    throw new Error(`Delete profile: ${JSON.stringify(delErr)}`)
  }

  console.log(`Purged profile ${RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeJrym, url } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelRyleThoughtsForYoungMenXml(xml)

  console.log(
    `Parsed ${parsed.gospelSection.subsections.length} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
  for (const sub of parsed.gospelSection.subsections) {
    console.log(`  ${sub.title}`)
  }
  if (parsed.passageKeys.length > 0) {
    const sample = parsed.passageKeys.slice(0, 8)
    console.log(`  keys sample: ${sample.join(', ')}${parsed.passageKeys.length > 8 ? '…' : ''}`)
  }

  if (parseOnly) return

  if (dryRun) {
    console.log(`Dry run: would upsert ${parsed.slug} (${parsed.title}).`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  if (purgeJrym) {
    await purgeRyleThoughtsForYoungMenProfile(supabase)
  }

  const result = await importRyleThoughtsForYoungMenToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
