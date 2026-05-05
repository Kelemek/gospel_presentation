/**
 * Repair stored `profiles.gospel_data` when a major outline start (esp. Roman **I.** with
 * homiletical openers) was merged into the previous subsection — **no CCEL fetch**. Uses
 * {@link repairGospelPresentationDataRomanOneMerges} (`ccelSermonHtml.ts`), matching current
 * `isMajorOutlineSegmentStart` rules. Rebuilds `spurgeon_passage_index` for updated profiles.
 *
 * Re-import from CCEL is still authoritative for ThML/source changes; this script only
 * re-splits existing `<p>…</p>` JSON shaped like the importer output.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 *   npm run fix-spurgeon-roman-one-gospel-json -- --dry-run
 *   npm run fix-spurgeon-roman-one-gospel-json
 *   npm run fix-spurgeon-roman-one-gospel-json -- --limit 50
 *   npm run fix-spurgeon-roman-one-gospel-json -- --slug sg03252
 *   npm run fix-spurgeon-roman-one-gospel-json -- --slug 3252
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import type { GospelPresentationData } from '../src/lib/types'
import { repairGospelPresentationDataRomanOneMerges } from '../src/lib/spurgeon/ccelSermonHtml'
import {
  passageKeysFromGospelPresentationData,
  sermonNumberFromSgSlug,
} from '../src/lib/spurgeon/passageKeysFromGospelData'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PAGE = 80
const SG_SLUG = /^sg\d{5}$/i

function normalizeSgSlug(raw: string): string | null {
  const t = raw.trim()
  if (SG_SLUG.test(t)) return t.toLowerCase()
  const n = parseInt(t, 10)
  if (Number.isFinite(n) && n > 0 && n <= 99999) {
    return `sg${String(n).padStart(5, '0')}`
  }
  return null
}

function parseArgs(argv: string[]) {
  let dryRun = false
  let limitProfiles: number | null = null
  let slugOnly: string | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true
    if (argv[i] === '--limit' && argv[i + 1]) {
      limitProfiles = Math.max(1, parseInt(argv[i + 1], 10) || 1)
      i++
    }
    if (argv[i] === '--slug') {
      const val = argv[i + 1]
      if (!val) throw new Error('--slug requires a value (e.g. sg03252 or 3252)')
      const norm = normalizeSgSlug(val)
      if (!norm) throw new Error(`Invalid --slug: ${val}`)
      slugOnly = norm
      i++
    }
  }
  return { dryRun, limitProfiles, slugOnly }
}

async function rebuildSpurgeonPassageIndex(
  supabase: SupabaseClient,
  profileId: string,
  slug: string,
  gospelData: GospelPresentationData
): Promise<void> {
  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index ${slug}: ${JSON.stringify(delErr)}`)
  }

  const keys = passageKeysFromGospelPresentationData(gospelData)
  const sermonNo = sermonNumberFromSgSlug(slug)
  if (keys.length === 0 || sermonNo === null) return

  const rows = keys.map((passage_key, i) => ({
    passage_key,
    profile_id: profileId,
    sermon_no: sermonNo,
    is_primary: i === 0,
  }))
  const { error: insErr } = await supabase.from('spurgeon_passage_index').insert(rows)
  if (insErr) {
    throw new Error(`Insert index ${slug}: ${JSON.stringify(insErr)}`)
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  let dryRun: boolean
  let limitProfiles: number | null
  let slugOnly: string | null
  try {
    ;({ dryRun, limitProfiles, slugOnly } = parseArgs(process.argv.slice(2)))
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }

  const supabase = createClient(url, key)

  let from = 0
  let scanned = 0
  let wouldUpdate = 0
  let updated = 0

  async function processRows(rows: { id: string; slug: string; gospel_data: unknown }[] | null) {
    if (!rows?.length) return
    for (const row of rows) {
      if (limitProfiles !== null && scanned >= limitProfiles) break
      scanned++

      const slug = typeof row.slug === 'string' ? row.slug : ''
      const raw = (row as { gospel_data: unknown }).gospel_data
      const gospelData = (Array.isArray(raw) ? raw : []) as GospelPresentationData

      const { gospelData: nextData, changed } = repairGospelPresentationDataRomanOneMerges(gospelData)
      if (!changed) continue

      if (dryRun) {
        wouldUpdate++
        console.log(`[dry-run] would update ${slug}`)
        continue
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ gospel_data: nextData as never })
        .eq('id', row.id)

      if (upErr) {
        console.error(`${slug}: update`, upErr)
        process.exit(1)
      }

      await rebuildSpurgeonPassageIndex(supabase, row.id, slug, nextData)
      updated++
      console.log(`Updated ${slug}`)
    }
  }

  if (slugOnly) {
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id, slug, gospel_data')
      .eq('slug', slugOnly)
      .eq('is_template', true)
      .maybeSingle()

    if (error) {
      console.error('profiles fetch:', error)
      process.exit(1)
    }
    if (!rows?.id) {
      console.error(`No template profile found with slug ${slugOnly}`)
      process.exit(1)
    }
    await processRows([rows as { id: string; slug: string; gospel_data: unknown }])
  } else {
    for (;;) {
      if (limitProfiles !== null && scanned >= limitProfiles) break

      const to = from + PAGE - 1
      const { data: rows, error } = await supabase
        .from('profiles')
        .select('id, slug, gospel_data')
        .like('slug', 'sg%')
        .eq('is_template', true)
        .order('slug', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('profiles fetch:', error)
        process.exit(1)
      }
      if (!rows?.length) break

      await processRows(rows)

      from += PAGE
      if (rows.length < PAGE) break
    }
  }

  console.log('\n--- summary ---')
  console.log(`Scanned: ${scanned}`)
  if (dryRun) {
    console.log(`Dry-run: would update ${wouldUpdate} profile(s).`)
  } else {
    console.log(`Updated: ${updated}`)
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
