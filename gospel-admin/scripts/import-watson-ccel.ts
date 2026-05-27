/**
 * Import Thomas Watson CCEL books into Supabase (one profile per work).
 *
 * Usage (from gospel-admin/):
 *   npm run import-watson -- --parse-only
 *   npm run import-watson -- --book divinity --parse-only
 *   npm run import-watson -- --dry-run
 *   npm run import-watson
 *   npm run import-watson -- --purge-tw
 *   npm run import-watson -- --purge-tw --book beatitudes
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { parseCcelWatsonXml } from '../src/lib/watson/ccelWatsonHtml'
import { importWatsonBookToSupabase } from '../src/lib/watson/importWatsonBookToSupabase'
import {
  allWatsonCcelBookIds,
  type WatsonCcelBookDef,
  type WatsonCcelBookId,
  WATSON_CCEL_BOOKS,
  watsonBookById,
} from '../src/lib/watson/watsonCcelManifest'
import { WATSON_BOOK_SLUGS } from '../src/lib/watson/watsonSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeTw = false
  let bookId: WatsonCcelBookId | null = null

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-tw') {
      purgeTw = true
      continue
    }
    if (argv[i] === '--book' && argv[i + 1]) {
      bookId = argv[i + 1].trim() as WatsonCcelBookId
      i++
    }
  }

  return { parseOnly, dryRun, purgeTw, bookId }
}

function booksToProcess(bookId: WatsonCcelBookId | null): WatsonCcelBookDef[] {
  if (bookId) {
    return [watsonBookById(bookId)]
  }
  return [...WATSON_CCEL_BOOKS]
}

async function purgeWatsonProfiles(supabase: SupabaseClient, slugs: string[]) {
  for (const slug of slugs) {
    const { data: profile, error: selErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (selErr) {
      throw new Error(`Lookup ${slug}: ${JSON.stringify(selErr)}`)
    }

    if (!profile?.id) {
      console.log(`No profile ${slug} to purge.`)
      continue
    }

    const { error: idxErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profile.id)
    if (idxErr) {
      throw new Error(`Delete index for ${slug}: ${JSON.stringify(idxErr)}`)
    }

    const { error: delErr } = await supabase.from('profiles').delete().eq('id', profile.id)
    if (delErr) {
      throw new Error(`Delete profile ${slug}: ${JSON.stringify(delErr)}`)
    }

    console.log(`Purged profile ${slug} and passage index rows.`)
  }
}

async function fetchAndParse(book: WatsonCcelBookDef) {
  console.log(`Fetching ${book.xmlUrl}…`)
  const res = await fetch(book.xmlUrl)
  if (!res.ok) {
    throw new Error(`Fetch ${book.id} failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelWatsonXml(xml, book)
  console.log(
    `  ${parsed.slug}: ${parsed.gospelSection.subsections.length} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
  if (parsed.passageKeys.length > 0) {
    const sample = parsed.passageKeys.slice(0, 6)
    console.log(`    keys sample: ${sample.join(', ')}${parsed.passageKeys.length > 6 ? '…' : ''}`)
  }
  return parsed
}

async function main() {
  const { parseOnly, dryRun, purgeTw, bookId } = parseArgs(process.argv.slice(2))

  if (bookId && !allWatsonCcelBookIds().includes(bookId)) {
    throw new Error(
      `Unknown --book ${bookId}. Expected one of: ${allWatsonCcelBookIds().join(', ')}`
    )
  }

  const books = booksToProcess(bookId)

  for (const book of books) {
    await fetchAndParse(book)
  }

  if (parseOnly) return

  if (dryRun) {
    console.log(`Dry run: would upsert ${books.map((b) => b.slug).join(', ')}.`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  if (purgeTw) {
    const slugs = bookId ? [watsonBookById(bookId).slug] : [...WATSON_BOOK_SLUGS]
    await purgeWatsonProfiles(supabase, slugs)
  }

  for (const book of books) {
    const res = await fetch(book.xmlUrl)
    if (!res.ok) {
      throw new Error(`Fetch ${book.id} failed: ${res.status} ${res.statusText}`)
    }
    const xml = await res.text()
    const parsed = parseCcelWatsonXml(xml, book)
    const result = await importWatsonBookToSupabase(supabase, parsed)
    console.log(
      `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
