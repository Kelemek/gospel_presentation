/**
 * Import Spurgeon sermons from a CCEL ThML volume XML file into Supabase profiles + spurgeon_passage_index.
 *
 * With `--parse-only`, fetches XML and runs the parser only (no `.env.local` or Supabase).
 *
 * Otherwise requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/import-spurgeon-ccel.ts --parse-only --url https://www.ccel.org/ccel/spurgeon/sermons08.xml --limit 99999
 *   npx tsx scripts/import-spurgeon-ccel.ts --limit 5
 *   npx tsx scripts/import-spurgeon-ccel.ts --limit 5 --url https://www.ccel.org/ccel/spurgeon/sermons01.xml
 *   npx tsx scripts/import-spurgeon-ccel.ts --url …/sermons02.xml --slug sg00062
 *     (parses the whole volume XML, imports only the matching slug; needs high parse cost)
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { parseCcelVolumeSermons } from '../src/lib/spurgeon/ccelSermonHtml'
import { importCcelParsedSermonToSupabase } from '../src/lib/spurgeon/importCcelParsedSermonToSupabase'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let limit = 5
  let slug: string | null = null
  let parseOnly = false
  let url =
    process.env.CCEL_SPURGEON_VOLUME_URL ||
    'https://www.ccel.org/ccel/spurgeon/sermons01.xml'
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10) || 5)
      i++
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
    if (argv[i] === '--slug' && argv[i + 1]) {
      slug = argv[i + 1].trim().toLowerCase()
      i++
    }
  }
  return { limit, url, slug, parseOnly }
}

function logParseOnlySummary(
  sermons: { slug: string; sermonTitle: string; sermonNo: number | null; passageKeys: string[] }[],
  opts: { volumeParsed: number; slug: string | null }
) {
  if (sermons.length === 0) {
    console.log(
      `Parse-only: no sermons in result (parsed ${opts.volumeParsed} from volume; check --limit, --slug, or XML).`
    )
    return
  }
  const nums = sermons.map((s) => s.sermonNo).filter((n): n is number => n != null)
  const minN = Math.min(...nums)
  const maxN = Math.max(...nums)
  const slugNote =
    opts.slug && opts.volumeParsed !== sermons.length
      ? ` (${opts.volumeParsed} in full parse; ${sermons.length} after --slug ${opts.slug})`
      : ''
  console.log(
    `Parse-only: ${sermons.length} sermon(s)${slugNote}. Slug range ${sermons[0].slug} → ${sermons[sermons.length - 1].slug}; catalog N min/max ${minN}…${maxN}.`
  )
  const pk = sermons.reduce((acc, s) => acc + s.passageKeys.length, 0)
  console.log(`  Passage keys (sum across result): ${pk}`)
}

async function main() {
  const { limit, url, slug, parseOnly } = parseArgs(process.argv.slice(2))
  const parseLimit = slug ? 99_999 : limit

  if (!parseOnly) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
      process.exit(1)
    }
  }

  console.log(
    `${parseOnly ? '[parse-only] ' : ''}Fetching ${url} (${slug ? `slug ${slug}, full-volume parse` : `limit ${limit}`})…`
  )

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`HTTP ${res.status} fetching volume XML`)
    process.exit(1)
  }
  const xml = await res.text()
  const parsed = parseCcelVolumeSermons(xml, { limit: parseLimit })
  const sermons = slug ? parsed.filter((s) => s.slug === slug) : parsed
  console.log(
    slug
      ? `Parsed ${parsed.length} sermon(s) from volume; ${sermons.length} match --slug.`
      : `Parsed ${sermons.length} sermon(s).`
  )

  if (slug && sermons.length === 0) {
    console.error(`No sermon with slug ${slug} in this volume (parsed ${parsed.length} sermon(s)).`)
    process.exit(1)
  }

  if (parseOnly) {
    logParseOnlySummary(sermons, { volumeParsed: parsed.length, slug })
    if (slug && sermons.length === 1) {
      const s = sermons[0]
      console.log(`  Title: ${s.sermonTitle}`)
      console.log(`  Passage keys on this sermon: ${s.passageKeys.length}`)
    }
    console.log('Parse-only done (no database writes).')
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  for (const sermon of sermons) {
    try {
      const r = await importCcelParsedSermonToSupabase(supabase, sermon)
      if (r.action === 'updated') {
        console.log(`Updated profile ${r.slug}`)
      } else {
        console.log(`Inserted profile ${r.slug}`)
      }
      if (r.passageKeyCount > 0) {
        console.log(`  Indexed ${r.passageKeyCount} passage key(s)`)
      } else {
        console.log('  No passage keys extracted')
      }
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
