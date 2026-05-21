/**
 * Import Jonathan Edwards CCEL Select Sermons into Supabase (`je01` … profiles).
 *
 * Usage (from gospel-admin/):
 *   npm run import-edwards -- --parse-only
 *   npm run import-edwards -- --dry-run
 *   npm run import-edwards
 *   npm run import-edwards -- --purge-je
 *   npm run import-edwards -- --slug je03
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CCEL_EDWARDS_SERMONS_XML_URL,
  parseCcelEdwardsSermons,
} from '../src/lib/edwards/ccelEdwardsHtml'
import { importCcelParsedEdwardsToSupabase } from '../src/lib/edwards/importCcelParsedEdwardsToSupabase'
import { isEdwardsSermonProfileSlug } from '../src/lib/edwards/edwardsSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeJe = false
  let limit = 99
  let slug: string | null = null
  let url = process.env.CCEL_EDWARDS_SERMONS_URL || CCEL_EDWARDS_SERMONS_XML_URL

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-je') {
      purgeJe = true
      continue
    }
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10) || 99)
      i++
    }
    if (argv[i] === '--slug' && argv[i + 1]) {
      slug = argv[i + 1].trim().toLowerCase()
      i++
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeJe, limit, slug, url }
}

async function purgeEdwardsProfiles(supabase: SupabaseClient) {
  const { data: profiles, error: selErr } = await supabase
    .from('profiles')
    .select('id,slug')
    .like('slug', 'je%')

  if (selErr) {
    throw new Error(`List je profiles: ${JSON.stringify(selErr)}`)
  }

  const toDelete = (profiles || []).filter((p) => isEdwardsSermonProfileSlug(p.slug))
  if (toDelete.length === 0) {
    console.log('No je* profiles to purge.')
    return
  }

  for (const p of toDelete) {
    const { error: idxErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', p.id)
    if (idxErr) {
      throw new Error(`Delete index for ${p.slug}: ${JSON.stringify(idxErr)}`)
    }
    const { error: delErr } = await supabase.from('profiles').delete().eq('id', p.id)
    if (delErr) {
      throw new Error(`Delete profile ${p.slug}: ${JSON.stringify(delErr)}`)
    }
    console.log(`Purged ${p.slug}`)
  }
}

async function main() {
  const { parseOnly, dryRun, purgeJe, limit, slug, url } = parseArgs(process.argv.slice(2))

  if (!parseOnly) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    }
    const supabase = createClient(supabaseUrl, serviceKey)

    if (purgeJe) {
      await purgeEdwardsProfiles(supabase)
      if (!dryRun && slug === null && limit === 99) {
        console.log('Purge complete. Re-run without --purge-je to import.')
        return
      }
    }
  }

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parseLimit = slug ? 99 : limit
  const sermons = parseCcelEdwardsSermons(xml, { limit: parseLimit, slug: slug ?? undefined })

  if (sermons.length === 0) {
    console.log('No sermons parsed (check --limit, --slug, or XML).')
    return
  }

  console.log(`Parsed ${sermons.length} sermon(s): ${sermons[0].slug} … ${sermons[sermons.length - 1].slug}`)
  for (const s of sermons) {
    console.log(`  ${s.slug}: ${s.sermonTitle} (${s.passageKeys.length} passage keys)`)
  }

  if (parseOnly) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  if (dryRun) {
    console.log('Dry run — no database writes.')
    return
  }

  for (const sermon of sermons) {
    const result = await importCcelParsedEdwardsToSupabase(supabase, sermon)
    console.log(`${result.action} ${result.slug} (${result.passageKeyCount} index keys)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
