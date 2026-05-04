/**
 * Import selected Met Tab catalog numbers from CCEL: maps each N to the correct `sermonsNN.xml`,
 * fetches each volume at most once, parses, then upserts only slugs `sg` + N that appear in XML.
 *
 * Skips when no CCEL volume covers N (e.g. 423–426) or the sermon is absent from that volume’s XML.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * For every catalog sermon missing from the DB across mapped Met Tab volumes (**1–3563**), prefer
 * `npm run import-spurgeon-missing` (see `import-spurgeon-ccel-missing.ts`).
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/import-spurgeon-ccel-gaps.ts --gaps 67,82,92 --dry-run
 *   npx tsx scripts/import-spurgeon-ccel-gaps.ts --gaps 92,141
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { ccelSpurgeonVolumeUrlForCatalogNo } from '../src/lib/spurgeon/ccelSpurgeonVolumeUrl'
import { importCcelParsedSermonToSupabase } from '../src/lib/spurgeon/importCcelParsedSermonToSupabase'
import { parseCcelVolumeSermons, slugForSermonNumber } from '../src/lib/spurgeon/ccelSermonHtml'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

function parseArgs(argv: string[]) {
  let gapsRaw: string | null = null
  let dryRun = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--gaps' && argv[i + 1]) {
      gapsRaw = argv[i + 1]
      i++
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
    }
  }
  return { gapsRaw, dryRun }
}

function parseCatalogNumbers(raw: string): number[] {
  const nums = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  return [...new Set(nums)].sort((a, b) => a - b)
}

async function main() {
  const { gapsRaw, dryRun } = parseArgs(process.argv.slice(2))
  if (!gapsRaw) {
    console.error('Usage: npx tsx scripts/import-spurgeon-ccel-gaps.ts --gaps 67,82,92 [--dry-run]')
    process.exit(1)
  }

  const catalogNos = parseCatalogNumbers(gapsRaw)
  if (catalogNos.length === 0) {
    console.error('No valid positive catalog numbers in --gaps')
    process.exit(1)
  }

  if (!dryRun && (!supabaseUrl || !supabaseServiceKey)) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const byUrl = new Map<string, number[]>()
  for (const n of catalogNos) {
    const url = ccelSpurgeonVolumeUrlForCatalogNo(n)
    if (!url) {
      console.log(`[skip] ${n}: no CCEL volume mapped for this catalog number`)
      continue
    }
    const arr = byUrl.get(url) ?? []
    arr.push(n)
    byUrl.set(url, arr)
  }

  const supabase = dryRun ? null : createClient(supabaseUrl, supabaseServiceKey)

  for (const [url, nums] of [...byUrl.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const uniqueNums = [...new Set(nums)].sort((a, b) => a - b)
    console.log(`\nFetching ${url} (${uniqueNums.length} catalog number(s))…`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`HTTP ${res.status} for ${url}`)
      process.exit(1)
    }
    const xml = await res.text()
    const parsed = parseCcelVolumeSermons(xml, { limit: 99_999 })
    console.log(`Parsed ${parsed.length} sermon(s).`)

    for (const n of uniqueNums) {
      const slug = slugForSermonNumber(n)
      const sermon = parsed.find((s) => s.slug === slug)
      if (!sermon) {
        console.log(`[skip] ${slug}: not in this volume’s XML (source gap or different slug)`)
        continue
      }
      if (dryRun) {
        const t = sermon.sermonTitle
        const short = t.length > 72 ? `${t.slice(0, 72)}…` : t
        console.log(`[dry-run] would import ${slug} — ${short}`)
        continue
      }
      const r = await importCcelParsedSermonToSupabase(supabase!, sermon)
      const idx = r.passageKeyCount > 0 ? `indexed ${r.passageKeyCount} key(s)` : 'no passage keys'
      console.log(`[${r.action}] ${r.slug} (${idx})`)
    }
  }

  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
