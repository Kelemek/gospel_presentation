/**
 * Import Richard Baxter CCEL *The Reformed Pastor* into Supabase (`bxrp` profile).
 *
 * Usage (from gospel-admin/):
 *   npm run import-reformed-pastor -- --parse-only
 *   npm run import-reformed-pastor -- --dry-run
 *   npm run import-reformed-pastor
 *   npm run import-reformed-pastor -- --purge-bxrp
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_REFORMED_PASTOR_XML_URL,
  parseCcelReformedPastorXml,
} from '../src/lib/reformedPastor/ccelReformedPastorHtml'
import { importReformedPastorToSupabase } from '../src/lib/reformedPastor/importReformedPastorToSupabase'
import { REFORMED_PASTOR_SLUG } from '../src/lib/reformedPastor/reformedPastorSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeBxrp = false
  let url = process.env.CCEL_REFORMED_PASTOR_URL || CCEL_REFORMED_PASTOR_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-bxrp') {
      purgeBxrp = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeBxrp, url }
}

async function purgeReformedPastorProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', REFORMED_PASTOR_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${REFORMED_PASTOR_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${REFORMED_PASTOR_SLUG} to purge.`)
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

  console.log(`Purged profile ${REFORMED_PASTOR_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeBxrp, url } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelReformedPastorXml(xml)

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

  if (purgeBxrp) {
    await purgeReformedPastorProfile(supabase)
  }

  const result = await importReformedPastorToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
