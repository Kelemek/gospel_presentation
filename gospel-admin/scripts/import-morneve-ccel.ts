/**
 * Import Spurgeon Morning & Evening from CCEL morneve.xml into Supabase profiles + passage index.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/import-morneve-ccel.ts --parse-only --limit 5
 *   npx tsx scripts/import-morneve-ccel.ts --limit 10
 *   npx tsx scripts/import-morneve-ccel.ts --slug me0101
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { CCEL_MORNEVE_XML_URL, parseCcelMorneveXml } from '../src/lib/spurgeon/ccelMorneveHtml'
import { importCcelMorneveDayToSupabase } from '../src/lib/spurgeon/importCcelMorneveDayToSupabase'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let limit = 9999
  let slug: string | null = null
  let parseOnly = false
  let url = process.env.CCEL_MORNEVE_URL || CCEL_MORNEVE_XML_URL
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

async function main() {
  const { limit, url, slug, parseOnly } = parseArgs(process.argv.slice(2))

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const allDays = parseCcelMorneveXml(xml, { limit: slug ? 9999 : limit })
  const days = slug ? allDays.filter((d) => d.slug === slug) : allDays

  console.log(`Parsed ${allDays.length} day(s) from XML; importing ${days.length}…`)

  if (parseOnly) {
    for (const d of days.slice(0, 10)) {
      console.log(`  ${d.slug}  ${d.title}  keys=${d.passageKeys.length}`)
    }
    if (days.length > 10) console.log(`  … and ${days.length - 10} more`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  let inserted = 0
  let updated = 0
  for (const day of days) {
    const result = await importCcelMorneveDayToSupabase(supabase, day)
    if (result.action === 'inserted') inserted++
    else updated++
    console.log(`${result.action} ${result.slug} (${result.passageKeyCount} index keys)`)
  }

  console.log(`Done: ${inserted} inserted, ${updated} updated.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
