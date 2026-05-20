/**
 * Import John Calvin CCEL commentary volumes into Supabase (`cv*` profiles + spurgeon_passage_index).
 *
 * With `--parse-only`, fetches XML and runs the parser only (no `.env.local` or Supabase).
 *
 * Usage (from gospel-admin/):
 *   npm run import-calvin -- --parse-only --volume calcom01
 *   npm run import-calvin -- --parse-only --volume calcom27
 *   npm run import-calvin -- --book GEN
 *   npm run import-calvin -- --volume calcom01 --dry-run
 *   npm run import-calvin -- --purge-cv   (delete all cv* profiles + index rows, then import full corpus)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  CALVIN_CCEL_VOLUMES,
  allCalvinBookUsfms,
  getCalvinVolume,
  volumesForBook,
  type CalvinCcelVolume,
} from '../src/lib/calvin/calvinCcelManifest'
import { parseCcelCalvinVolume, type ParsedCalvinBookChunk } from '../src/lib/calvin/ccelCalvinHtml'
import { importCalvinVolumeChunksToSupabase } from '../src/lib/calvin/importCalvinBookToSupabase'
import { calvinProfileTitleForUsfm } from '../src/lib/calvin/calvinSlug'
import { normalizeCalvinBookUsfm } from '../src/lib/calvin/calvinUsfmNormalize'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeCv = false
  let volumeId: string | null = null
  let bookUsfm: string | null = null
  let limit: number | null = null

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-cv') {
      purgeCv = true
      continue
    }
    if (argv[i] === '--volume' && argv[i + 1]) {
      volumeId = argv[i + 1].replace(/\.xml$/i, '').trim()
      i++
      continue
    }
    if (argv[i] === '--book' && argv[i + 1]) {
      bookUsfm = argv[i + 1].trim().toUpperCase()
      i++
      continue
    }
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10) || 1)
      i++
      continue
    }
  }

  return { parseOnly, dryRun, purgeCv, volumeId, bookUsfm, limit }
}

async function purgeCalvinProfiles(supabase: SupabaseClient) {
  const { data: profiles, error: listErr } = await supabase
    .from('profiles')
    .select('id, slug')
    .ilike('slug', 'cv%')

  if (listErr) {
    throw new Error(`List cv profiles: ${JSON.stringify(listErr)}`)
  }

  const ids: string[] = []
  for (const row of profiles ?? []) {
    if (row && typeof row.id === 'string') ids.push(row.id)
  }
  if (ids.length === 0) {
    console.log('No cv* profiles to purge.')
    return
  }

  const { error: idxErr } = await supabase.from('spurgeon_passage_index').delete().in('profile_id', ids)
  if (idxErr) {
    throw new Error(`Delete passage index: ${JSON.stringify(idxErr)}`)
  }

  const { error: delErr } = await supabase.from('profiles').delete().in('id', ids)
  if (delErr) {
    throw new Error(`Delete profiles: ${JSON.stringify(delErr)}`)
  }

  console.log(`Purged ${ids.length} cv* profile(s).`)
}

async function fetchVolumeXml(volume: CalvinCcelVolume): Promise<string> {
  const res = await fetch(volume.url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${volume.url}`)
  }
  return res.text()
}

function mergeChunksByBook(chunks: ParsedCalvinBookChunk[]): ParsedCalvinBookChunk[] {
  const byBook = new Map<string, ParsedCalvinBookChunk>()
  for (const chunk of chunks) {
    const key = normalizeCalvinBookUsfm(chunk.bookUsfm) ?? chunk.bookUsfm
    const prev = byBook.get(key)
    if (!prev) {
      byBook.set(key, {
        bookUsfm: key,
        subsections: [...chunk.subsections],
        passageKeys: [...chunk.passageKeys],
      })
    } else {
      prev.subsections.push(...chunk.subsections)
      prev.passageKeys.push(...chunk.passageKeys)
    }
  }
  return [...byBook.values()]
}

function logParseChunks(chunks: ParsedCalvinBookChunk[], label: string) {
  console.log(`${label}: ${chunks.length} book chunk(s)`)
  for (const c of chunks) {
    console.log(
      `  ${c.bookUsfm} (${calvinProfileTitleForUsfm(c.bookUsfm)}): ${c.subsections.length} subsection(s), ${c.passageKeys.length} passage key(s)`
    )
    if (c.subsections[0]) {
      console.log(`    first: ${c.subsections[0].title}`)
    }
  }
}

async function main() {
  const { parseOnly, dryRun, purgeCv, volumeId, bookUsfm, limit } = parseArgs(process.argv.slice(2))

  if (purgeCv && (parseOnly || dryRun)) {
    console.error('--purge-cv cannot be combined with --parse-only or --dry-run')
    process.exit(1)
  }

  if (!parseOnly && !dryRun) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
      process.exit(1)
    }
  }

  let volumes: CalvinCcelVolume[] = []
  if (volumeId) {
    const vol = getCalvinVolume(volumeId)
    if (!vol) {
      console.error(`Unknown volume ${volumeId}`)
      process.exit(1)
    }
    volumes = [vol]
  } else if (bookUsfm) {
    volumes = volumesForBook(bookUsfm)
    if (volumes.length === 0) {
      console.error(`No volumes mapped for book ${bookUsfm}`)
      process.exit(1)
    }
  } else {
    volumes = limit ? CALVIN_CCEL_VOLUMES.slice(0, limit) : CALVIN_CCEL_VOLUMES
  }

  const allChunks: ParsedCalvinBookChunk[] = []
  for (const volume of volumes) {
    console.log(`Fetching ${volume.id}…`)
    const xml = await fetchVolumeXml(volume)
    const chunks = parseCcelCalvinVolume(xml, volume)
    allChunks.push(...chunks)
    if (volumeId) {
      logParseChunks(chunks, `[parse] ${volume.id}`)
    }
  }

  const merged =
    bookUsfm && !volumeId
      ? mergeChunksByBook(allChunks).filter((c) => c.bookUsfm === bookUsfm)
      : volumeId
        ? allChunks
        : mergeChunksByBook(allChunks)

  if (parseOnly || dryRun) {
    logParseChunks(merged, parseOnly ? 'Parse-only' : 'Dry-run')
    if (bookUsfm && !volumeId) {
      console.log(`Books in corpus: ${allCalvinBookUsfms().length}`)
    }
    console.log(parseOnly ? 'Parse-only done (no database writes).' : 'Dry-run done (no database writes).')
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (purgeCv) {
    await purgeCalvinProfiles(supabase)
  }

  const results = await importCalvinVolumeChunksToSupabase(
    supabase,
    merged,
    bookUsfm && !volumeId ? { mergeMode: 'replace' } : undefined
  )

  for (const r of results) {
    console.log(
      `${r.action === 'updated' ? 'Updated' : 'Inserted'} ${r.slug} (${r.bookUsfm}): ${r.subsectionCount} subsection(s), ${r.passageKeyCount} passage key(s)`
    )
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
