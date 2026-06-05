/**
 * Import Martin Luther CCEL *The Bondage of the Will* into Supabase (`ltbw` profile).
 *
 * Usage (from gospel-admin/):
 *   npm run import-luther-bondage -- --parse-only
 *   npm run import-luther-bondage -- --dry-run
 *   npm run import-luther-bondage
 *   npm run import-luther-bondage -- --purge-ltbw
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_LUTHER_BONDAGE_XML_URL,
  parseCcelLutherBondageXml,
} from '../src/lib/lutherBondage/ccelLutherBondageHtml'
import { importLutherBondageToSupabase } from '../src/lib/lutherBondage/importLutherBondageToSupabase'
import { LUTHER_BONDAGE_SLUG } from '../src/lib/lutherBondage/lutherBondageSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeLtbw = false
  let url = process.env.CCEL_LUTHER_BONDAGE_URL || CCEL_LUTHER_BONDAGE_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-ltbw') {
      purgeLtbw = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeLtbw, url }
}

async function purgeLutherBondageProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', LUTHER_BONDAGE_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${LUTHER_BONDAGE_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${LUTHER_BONDAGE_SLUG} to purge.`)
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

  console.log(`Purged profile ${LUTHER_BONDAGE_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeLtbw, url } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelLutherBondageXml(xml)

  const subsectionCount = parsed.gospelData.reduce(
    (n, sec) => n + (sec.subsections?.length ?? 0),
    0
  )
  console.log(
    `Parsed ${parsed.gospelData.length} gospel section(s), ${subsectionCount} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
  for (const sec of parsed.gospelData) {
    console.log(`  [${sec.section}] ${sec.title} (${sec.subsections.length} subsections)`)
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

  if (purgeLtbw) {
    await purgeLutherBondageProfile(supabase)
  }

  const result = await importLutherBondageToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.sectionCount} sections, ${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
