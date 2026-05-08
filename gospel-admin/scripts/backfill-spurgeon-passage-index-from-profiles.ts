/**
 * Scan all Spurgeon sermon templates (slug sg*, is_template) and insert any passage keys
 * from gospel_data into spurgeon_passage_index that are not already present for that profile.
 *
 * Uses the same key pipeline as imports: {@link passageKeysFromGospelPresentationData}.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/backfill-spurgeon-passage-index-from-profiles.ts --dry-run
 *   npx tsx scripts/backfill-spurgeon-passage-index-from-profiles.ts
 *   npx tsx scripts/backfill-spurgeon-passage-index-from-profiles.ts --verbose --limit 20
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import type { GospelPresentationData } from '../src/lib/types'
import {
  passageKeysFromGospelPresentationData,
  sermonNumberFromSgSlug,
} from '../src/lib/spurgeon/passageKeysFromGospelData'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PAGE = 80

function parseArgs(argv: string[]) {
  let dryRun = false
  let verbose = false
  let limitProfiles: number | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true
    if (argv[i] === '--verbose') verbose = true
    if (argv[i] === '--limit' && argv[i + 1]) {
      limitProfiles = Math.max(1, parseInt(argv[i + 1], 10) || 1)
      i++
    }
  }
  return { dryRun, verbose, limitProfiles }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const { dryRun, verbose, limitProfiles } = parseArgs(process.argv.slice(2))
  const supabase = createClient(url, key)

  let from = 0
  let totalProfiles = 0
  let totalInserted = 0
  let totalSkippedProfiles = 0

  for (;;) {
    const to = from + PAGE - 1
    const q = supabase
      .from('profiles')
      .select('id, slug, gospel_data')
      .like('slug', 'sg%')
      .eq('is_template', true)
      .order('slug', { ascending: true })
      .range(from, to)

    const { data: rows, error } = await q
    if (error) {
      console.error('profiles fetch:', error)
      process.exit(1)
    }
    if (!rows?.length) break

    for (const row of rows) {
      if (limitProfiles !== null && totalProfiles >= limitProfiles) {
        from = 1e9
        break
      }
      totalProfiles++
      const gospelData = (row as { gospel_data: unknown }).gospel_data as GospelPresentationData
      const keys = passageKeysFromGospelPresentationData(Array.isArray(gospelData) ? gospelData : [])
      if (keys.length === 0) {
        if (verbose) console.log(`${row.slug}: no keys extracted`)
        continue
      }

      const { data: existing, error: exErr } = await supabase
        .from('spurgeon_passage_index')
        .select('passage_key')
        .eq('profile_id', row.id)

      if (exErr) {
        console.error(`${row.slug}: index read`, exErr)
        process.exit(1)
      }

      const have = new Set((existing || []).map((r: { passage_key: string }) => r.passage_key))
      const missing = keys.filter((k) => !have.has(k))
      if (missing.length === 0) {
        totalSkippedProfiles++
        if (verbose) console.log(`${row.slug}: up to date (${keys.length} keys)`)
        continue
      }

      const sermonNo = sermonNumberFromSgSlug(String(row.slug))
      const insertRows = missing.map((passage_key) => ({
        passage_key,
        profile_id: row.id,
        sermon_no: sermonNo,
        is_primary: false,
      }))

      if (verbose) {
        console.log(`${row.slug}: inserting ${missing.length} key(s): ${missing.join(', ')}`)
      } else {
        console.log(`${row.slug}: +${missing.length} key(s)`)
      }

      if (!dryRun) {
        const { error: insErr } = await supabase.from('spurgeon_passage_index').insert(insertRows)
        if (insErr) {
          console.error(`${row.slug}: insert`, insErr)
          process.exit(1)
        }
      }
      totalInserted += missing.length
    }

    if (limitProfiles !== null && totalProfiles >= limitProfiles) break
    if (!rows || rows.length < PAGE) break
    from += PAGE
  }

  console.log(
    dryRun
      ? `[dry-run] scanned ${totalProfiles} profile(s); would insert ${totalInserted} index row(s).`
      : `Done. Scanned ${totalProfiles} profile(s); inserted ${totalInserted} index row(s); ${totalSkippedProfiles} already complete.`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
