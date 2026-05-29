/**
 * Import Matthew Henry CCEL complete commentary volumes into Supabase (`mh*` profiles + spurgeon_passage_index).
 *
 * With `--parse-only`, fetches XML and runs the parser only (no `.env.local` or Supabase).
 *
 * Usage (from gospel-admin/):
 *   npm run import-henry -- --parse-only --volume mhc1
 *   npm run import-henry -- --book GEN
 *   npm run import-henry -- --volume mhc1 --dry-run
 *   npm run import-henry -- --purge-mh   (delete all mh* profiles + index rows, then import full corpus)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  HENRY_CCEL_VOLUMES,
  allHenryBookUsfms,
  getHenryVolume,
  volumesForBook,
  type HenryCcelVolume,
} from '../src/lib/henry/henryCcelManifest'
import { parseCcelHenryVolume, type ParsedHenryBookChunk } from '../src/lib/henry/ccelHenryHtml'
import { importHenryVolumeChunksToSupabase } from '../src/lib/henry/importHenryBookToSupabase'
import { henryProfileTitleForUsfm } from '../src/lib/henry/henrySlug'
import { normalizeCalvinBookUsfm } from '../src/lib/calvin/calvinUsfmNormalize'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeMh = false
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
    if (argv[i] === '--purge-mh') {
      purgeMh = true
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

  return { parseOnly, dryRun, purgeMh, volumeId, bookUsfm, limit }
}

async function purgeHenryProfiles(supabase: SupabaseClient) {
  const { data: profiles, error: listErr } = await supabase
    .from('profiles')
    .select('id, slug')
    .ilike('slug', 'mh%')

  if (listErr) {
    throw new Error(`List mh profiles: ${JSON.stringify(listErr)}`)
  }

  const ids: string[] = []
  for (const row of profiles ?? []) {
    if (row && typeof row.id === 'string') ids.push(row.id)
  }
  if (ids.length === 0) {
    console.log('No mh* profiles to purge.')
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

  console.log(`Purged ${ids.length} mh* profile(s).`)
}

async function fetchVolumeXml(volume: HenryCcelVolume): Promise<string> {
  const res = await fetch(volume.url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${volume.url}`)
  }
  return res.text()
}

function mergeChunksByBook(chunks: ParsedHenryBookChunk[]): ParsedHenryBookChunk[] {
  const byBook = new Map<string, ParsedHenryBookChunk>()
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

function logParseChunks(chunks: ParsedHenryBookChunk[], label: string) {
  console.log(`${label}: ${chunks.length} book chunk(s)`)
  let totalSubsections = 0
  let totalKeys = 0
  for (const c of chunks) {
    totalSubsections += c.subsections.length
    totalKeys += c.passageKeys.length
    const ratio =
      c.subsections.length > 0
        ? (c.passageKeys.length / c.subsections.length).toFixed(1)
        : '—'
    console.log(
      `  ${c.bookUsfm} (${henryProfileTitleForUsfm(c.bookUsfm)}): ${c.subsections.length} subsection(s), ${c.passageKeys.length} passage key(s), ${ratio} keys/subsection`
    )
    if (c.subsections[0]) {
      console.log(`    first: ${c.subsections[0].title}`)
    }
  }
  const corpusRatio =
    totalSubsections > 0 ? (totalKeys / totalSubsections).toFixed(1) : '—'
  console.log(
    `  TOTAL: ${totalSubsections} subsection(s), ${totalKeys} passage key(s), ${corpusRatio} keys/subsection (chapter keys + scripRef)`
  )
}

async function main() {
  const { parseOnly, dryRun, purgeMh, volumeId, bookUsfm, limit } = parseArgs(process.argv.slice(2))

  if (purgeMh && (parseOnly || dryRun)) {
    console.error('--purge-mh cannot be combined with --parse-only or --dry-run')
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

  let volumes: HenryCcelVolume[] = []
  if (volumeId) {
    const vol = getHenryVolume(volumeId)
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
    volumes = limit ? HENRY_CCEL_VOLUMES.slice(0, limit) : HENRY_CCEL_VOLUMES
  }

  const allChunks: ParsedHenryBookChunk[] = []
  for (const volume of volumes) {
    console.log(`Fetching ${volume.id}…`)
    const xml = await fetchVolumeXml(volume)
    const chunks = parseCcelHenryVolume(xml, volume)
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
      console.log(`Books in corpus: ${allHenryBookUsfms().length}`)
    }
    console.log(parseOnly ? 'Parse-only done (no database writes).' : 'Dry-run done (no database writes).')
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (purgeMh) {
    await purgeHenryProfiles(supabase)
  }

  const results = await importHenryVolumeChunksToSupabase(
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
