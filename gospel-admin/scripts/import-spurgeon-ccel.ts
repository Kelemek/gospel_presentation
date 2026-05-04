/**
 * Import Spurgeon sermons from a CCEL ThML volume XML file into Supabase profiles + spurgeon_passage_index.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage (from gospel-admin/):
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

function parseArgs(argv: string[]) {
  let limit = 5
  let slug: string | null = null
  let url =
    process.env.CCEL_SPURGEON_VOLUME_URL ||
    'https://www.ccel.org/ccel/spurgeon/sermons01.xml'
  for (let i = 0; i < argv.length; i++) {
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
  return { limit, url, slug }
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const { limit, url, slug } = parseArgs(process.argv.slice(2))
  const parseLimit = slug ? 99_999 : limit
  console.log(
    `Fetching ${url} (${slug ? `slug ${slug}, full-volume parse` : `limit ${limit}`})…`
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
