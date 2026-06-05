/**
 * Import J.C. Ryle CCEL *Holiness* into Supabase (`jryh` profile).
 *
 * Usage (from gospel-admin/):
 *   npm run import-ryle-holiness -- --parse-only
 *   npm run import-ryle-holiness -- --dry-run
 *   npm run import-ryle-holiness
 *   npm run import-ryle-holiness -- --purge-jryh
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_RYLE_HOLINESS_XML_URL,
  parseCcelRyleHolinessXml,
} from '../src/lib/ryleHoliness/ccelRyleHolinessHtml'
import { importRyleHolinessToSupabase } from '../src/lib/ryleHoliness/importRyleHolinessToSupabase'
import { RYLE_HOLINESS_SLUG } from '../src/lib/ryleHoliness/ryleHolinessSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeJryh = false
  let url = process.env.CCEL_RYLE_HOLINESS_URL || CCEL_RYLE_HOLINESS_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-jryh') {
      purgeJryh = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeJryh, url }
}

async function purgeRyleHolinessProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', RYLE_HOLINESS_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${RYLE_HOLINESS_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${RYLE_HOLINESS_SLUG} to purge.`)
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

  console.log(`Purged profile ${RYLE_HOLINESS_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeJryh, url } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelRyleHolinessXml(xml)

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

  if (purgeJryh) {
    await purgeRyleHolinessProfile(supabase)
  }

  const result = await importRyleHolinessToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
