/**
 * Import CCEL *Systematic Theology* (Louis Berkhof) into Supabase (`lbst` profile).
 *
 * Usage (from gospel-admin/):
 *   npm run import-berkhof -- --parse-only
 *   npm run import-berkhof -- --dry-run
 *   npm run import-berkhof
 *   npm run import-berkhof -- --purge-lbst
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_BERKHOF_XML_URL,
  inventoryBerkhofThml,
  parseCcelBerkhofXml,
  subsectionCountForBerkhof,
} from '../src/lib/berkhof/ccelBerkhofHtml'
import { importBerkhofToSupabase } from '../src/lib/berkhof/importBerkhofToSupabase'
import { BERKHOF_ST_SLUG } from '../src/lib/berkhof/berkhofSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeLbst = false
  let url = process.env.CCEL_BERKHOF_URL || CCEL_BERKHOF_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-lbst') {
      purgeLbst = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeLbst, url }
}

async function purgeBerkhofProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', BERKHOF_ST_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${BERKHOF_ST_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${BERKHOF_ST_SLUG} to purge.`)
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

  console.log(`Purged profile ${BERKHOF_ST_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeLbst, url } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()

  const inventory = inventoryBerkhofThml(xml)
  console.log(`ThML div1 count: ${inventory.div1Count}`)
  for (const part of inventory.partDiv1s) {
    console.log(
      `  ${part.title}: div2=${part.div2Count}, div3=${part.div3Count}, subsections≈${part.subsectionCount}`
    )
  }

  if (parseOnly) return

  const parsed = parseCcelBerkhofXml(xml)
  console.log(
    `Parsed ${parsed.gospelData.length} section(s), ${subsectionCountForBerkhof(parsed.gospelData)} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
  for (const sec of parsed.gospelData) {
    console.log(`  [${sec.section}] ${sec.title} (${sec.subsections.length} subsections)`)
  }
  if (parsed.passageKeys.length > 0) {
    const sample = parsed.passageKeys.slice(0, 8)
    console.log(`  keys sample: ${sample.join(', ')}${parsed.passageKeys.length > 8 ? '…' : ''}`)
  }

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

  if (purgeLbst) {
    await purgeBerkhofProfile(supabase)
  }

  const result = await importBerkhofToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.sectionCount} sections, ${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
