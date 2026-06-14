/**
 * Import A.W. Pink *The Attributes of God* (Chapel Library edition) into Supabase (`pkag`).
 *
 * Usage (from gospel-admin/):
 *   npm run import-pink-attributes -- --parse-only
 *   npm run import-pink-attributes -- --dry-run
 *   npm run import-pink-attributes
 *   npm run import-pink-attributes -- --purge-pkag
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { importPinkAttributesToSupabase } from '../src/lib/pinkAttributes/importPinkAttributesToSupabase'
import {
  parsePinkAttributesSource,
  type PinkAttributesSourceFile,
} from '../src/lib/pinkAttributes/parsePinkAttributesSource'
import { PINK_ATTRIBUTES_SLUG } from '../src/lib/pinkAttributes/pinkAttributesSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const DEFAULT_SOURCE = path.join(__dirname, '../data/pink-attributes/chapters.json')

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgePkag = false
  let sourcePath = DEFAULT_SOURCE

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-pkag') {
      purgePkag = true
      continue
    }
    if (argv[i] === '--source' && argv[i + 1]) {
      sourcePath = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgePkag, sourcePath }
}

async function purgePinkAttributesProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', PINK_ATTRIBUTES_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${PINK_ATTRIBUTES_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${PINK_ATTRIBUTES_SLUG} to purge.`)
    return
  }

  const { error: idxErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profile.id)
  if (idxErr) {
    throw new Error(`Delete index: ${JSON.stringify(idxErr)}`)
  }

  const { error: delErr } = await supabase.from('profiles').delete().eq('id', profile.id)
  if (delErr) {
    throw new Error(`Delete profile: ${JSON.stringify(delErr)}`)
  }

  console.log(`Purged profile ${PINK_ATTRIBUTES_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgePkag, sourcePath } = parseArgs(process.argv.slice(2))

  console.log(`Reading ${sourcePath}…`)
  const raw = fs.readFileSync(path.resolve(sourcePath), 'utf8')
  const data = JSON.parse(raw) as PinkAttributesSourceFile
  const parsed = parsePinkAttributesSource(data)

  console.log(
    `Parsed ${parsed.gospelSection.subsections.length} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
  for (const sub of parsed.gospelSection.subsections) {
    console.log(`  ${sub.title}`)
  }
  if (parsed.passageKeys.length > 0) {
    const sample = parsed.passageKeys.slice(0, 8)
    console.log(`  keys sample: ${sample.join(', ')}${parsed.passageKeys.length > 8 ? '…' : ''}`)
  }

  if (parseOnly) return

  if (dryRun) {
    console.log(`Dry run: would upsert ${parsed.slug} (${parsed.title}).`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  if (purgePkag) {
    await purgePinkAttributesProfile(supabase)
  }

  const result = await importPinkAttributesToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
