/**
 * Import Spurgeon Met Tab sermons that appear in CCEL but are not yet in `profiles` (slug `sg` + five digits).
 *
 * Fetches each mapped volume once (`sermons01.xml` … `sermons63.xml`, catalog **1–3563** per
 * `ccelSpurgeonVolumeUrl.ts`). Numbers **423–426** and sequence holes **1451–1452**, **1876**, **2000**
 * have no CCEL volume range. Catalog **3564+** is out of scope until more volumes are added to the map.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 *   npm run import-spurgeon-missing -- --dry-run
 *   npm run import-spurgeon-missing
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { ccelSpurgeonMetTabVolumeUrls } from '../src/lib/spurgeon/ccelSpurgeonVolumeUrl'
import { importCcelParsedSermonToSupabase } from '../src/lib/spurgeon/importCcelParsedSermonToSupabase'
import { parseCcelVolumeSermons } from '../src/lib/spurgeon/ccelSermonHtml'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const SG_MET_TAB_SLUG = /^sg\d{5}$/

function parseArgs(argv: string[]) {
  let dryRun = false
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true
  }
  return { dryRun }
}

async function fetchExistingMetTabSlugs(supabase: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>()
  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug')
      .like('slug', 'sg%')
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`List profiles slugs: ${JSON.stringify(error)}`)
    }
    if (!data?.length) break
    for (const row of data) {
      const s = typeof row.slug === 'string' ? row.slug.trim() : ''
      if (SG_MET_TAB_SLUG.test(s)) set.add(s)
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return set
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  console.log('Loading existing Met Tab-style profile slugs (sg + five digits)…')
  const existing = await fetchExistingMetTabSlugs(supabase)
  console.log(`Found ${existing.size} profile(s) with sg##### slugs.`)

  const urls = ccelSpurgeonMetTabVolumeUrls()
  let dryWould = 0
  let inserted = 0
  let updated = 0
  let skippedPresent = 0

  for (const url of urls) {
    console.log(`\nFetching ${url}…`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`HTTP ${res.status}`)
      process.exit(1)
    }
    const xml = await res.text()
    const parsed = parseCcelVolumeSermons(xml, { limit: 99_999 })
    console.log(`Parsed ${parsed.length} sermon(s).`)

    const missingHere = parsed.filter((s) => !existing.has(s.slug))
    skippedPresent += parsed.length - missingHere.length

    if (missingHere.length === 0) {
      console.log('  Nothing missing from this volume (all slugs already in DB).')
      continue
    }

    console.log(`  ${missingHere.length} sermon(s) not in DB yet.`)

    if (dryRun) {
      dryWould += missingHere.length
      for (const s of missingHere) {
        const t = s.sermonTitle
        const short = t.length > 72 ? `${t.slice(0, 72)}…` : t
        console.log(`  [dry-run] would import ${s.slug} — ${short}`)
      }
      for (const s of missingHere) existing.add(s.slug)
      continue
    }

    for (const sermon of missingHere) {
      const r = await importCcelParsedSermonToSupabase(supabase, sermon)
      if (r.action === 'inserted') inserted++
      else updated++
      existing.add(sermon.slug)
      const idx = r.passageKeyCount > 0 ? `indexed ${r.passageKeyCount} key(s)` : 'no passage keys'
      console.log(`  [${r.action}] ${r.slug} (${idx})`)
    }
  }

  console.log('\n--- summary ---')
  console.log(`Skipped (already in DB): ${skippedPresent}`)
  if (dryRun) {
    console.log(`Dry-run: would import ${dryWould} sermon(s).`)
  } else {
    console.log(`Inserted: ${inserted}, updated: ${updated}`)
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
