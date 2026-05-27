/**
 * Import Robert Murray M'Cheyne one-year reading plan into Supabase (`mchy` profile).
 *
 * Usage (from gospel-admin/):
 *   npm run import-mcheyne -- --parse-only
 *   npm run import-mcheyne -- --dry-run
 *   npm run import-mcheyne
 *   npm run import-mcheyne -- --purge-mchy
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { parseMcheynePlanFile } from '../src/lib/mcheyne/buildMcheyneGospelData'
import { importMcheyneToSupabase } from '../src/lib/mcheyne/importMcheyneToSupabase'
import { MCHEYNE_SLUG } from '../src/lib/mcheyne/mcheyneSlug'
import type { McheynePlanFile } from '../src/lib/mcheyne/mcheynePlanTypes'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const DEFAULT_PLAN_PATH = path.join(__dirname, '../data/mcheyne/plan.json')

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeMchy = false
  let planPath = DEFAULT_PLAN_PATH

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-mchy') {
      purgeMchy = true
      continue
    }
    if (argv[i] === '--plan' && argv[i + 1]) {
      planPath = path.resolve(argv[i + 1])
      i++
    }
  }

  return { parseOnly, dryRun, purgeMchy, planPath }
}

function loadPlan(planPath: string): McheynePlanFile {
  const raw = fs.readFileSync(planPath, 'utf8')
  const plan = JSON.parse(raw) as McheynePlanFile
  if (plan.version !== 1 || !Array.isArray(plan.days) || plan.days.length !== 365) {
    throw new Error(`Invalid M'Cheyne plan at ${planPath}`)
  }
  return plan
}

async function purgeMcheyneProfile(supabase: SupabaseClient) {
  const { data: profile, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', MCHEYNE_SLUG)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${MCHEYNE_SLUG}: ${JSON.stringify(selErr)}`)
  }

  if (!profile?.id) {
    console.log(`No profile ${MCHEYNE_SLUG} to purge.`)
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

  console.log(`Purged profile ${MCHEYNE_SLUG} and passage index rows.`)
}

async function main() {
  const { parseOnly, dryRun, purgeMchy, planPath } = parseArgs(process.argv.slice(2))

  console.log(`Loading ${planPath}…`)
  const plan = loadPlan(planPath)
  const parsed = parseMcheynePlanFile(plan)

  console.log(
    `${parsed.slug}: ${parsed.gospelData.length} section(s), ${parsed.gospelData.reduce((n, s) => n + s.subsections.length, 0)} subsection(s), ${parsed.passageKeys.length} passage key(s).`
  )
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

  if (purgeMchy) {
    await purgeMcheyneProfile(supabase)
  }

  const result = await importMcheyneToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.sectionCount} sections, ${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
