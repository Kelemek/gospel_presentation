/**
 * Import Spurgeon *Lectures to My Students* (Grace Gems First Series) into Supabase (`ltms`).
 *
 * Usage (from gospel-admin/):
 *   npm run import-lectures-to-my-students -- --parse-only
 *   npm run import-lectures-to-my-students -- --dry-run
 *   npm run import-lectures-to-my-students
 *   npm run import-lectures-to-my-students -- --purge-ltms
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { importLecturesToMyStudentsToSupabase } from '../src/lib/lecturesToMyStudents/importLecturesToMyStudentsToSupabase'
import { LECTURES_TO_MY_STUDENTS_SLUG } from '../src/lib/lecturesToMyStudents/lecturesToMyStudentsSlug'
import {
  parseGraceGemsLecturesSource,
  type LecturesToMyStudentsSourceFile,
} from '../src/lib/lecturesToMyStudents/parseGraceGemsLecturesSource'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const DEFAULT_SOURCE = path.join(__dirname, '../data/lectures-to-my-students/chapters.json')

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeLtms = false
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
    if (argv[i] === '--purge-ltms') {
      purgeLtms = true
      continue
    }
    if (argv[i] === '--source' && argv[i + 1]) {
      sourcePath = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purgeLtms, sourcePath }
}

async function purgeLecturesToMyStudentsProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', LECTURES_TO_MY_STUDENTS_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${LECTURES_TO_MY_STUDENTS_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${LECTURES_TO_MY_STUDENTS_SLUG} to purge.`)
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

  console.log(`Purged profile ${LECTURES_TO_MY_STUDENTS_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeLtms, sourcePath } = parseArgs(process.argv.slice(2))

  console.log(`Reading ${sourcePath}…`)
  const raw = fs.readFileSync(path.resolve(sourcePath), 'utf8')
  const data = JSON.parse(raw) as LecturesToMyStudentsSourceFile
  const parsed = parseGraceGemsLecturesSource(data)

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

  if (purgeLtms) {
    await purgeLecturesToMyStudentsProfile(supabase)
  }

  const result = await importLecturesToMyStudentsToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
