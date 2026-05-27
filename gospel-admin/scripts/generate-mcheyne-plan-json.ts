/**
 * Build gospel-admin/data/mcheyne/plan.json from the public M'Cheyne schedule.
 *
 * Source: Robert Murray M'Cheyne one-year plan (365 calendar days; no Feb 29).
 * Raw schedule keyed by MMDD is adapted from the open mcheyne-api corpus.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/generate-mcheyne-plan-json.ts
 *   npx tsx scripts/generate-mcheyne-plan-json.ts --write
 */
import * as fs from 'fs'
import * as path from 'path'
import { buildPlanFromRaw } from '../src/lib/mcheyne/buildMcheynePlanFromRaw'

const SOURCE_URL =
  'https://raw.githubusercontent.com/speric/mcheyne-api/master/plan.json'

async function main() {
  const write = process.argv.includes('--write')
  const outPath = path.join(__dirname, '../data/mcheyne/plan.json')

  console.log(`Fetching ${SOURCE_URL}…`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const rawPlan = (await res.json()) as Record<string, RawDay>
  const plan = buildPlanFromRaw(rawPlan)

  const json = `${JSON.stringify(plan, null, 2)}\n`
  if (write) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, json, 'utf8')
    console.log(`Wrote ${outPath} (${plan.days.length} days).`)
  } else {
    console.log(`Built ${plan.days.length} days (dry run; pass --write to save).`)
    console.log(`Day 1:`, plan.days[0])
    console.log(`Day 365:`, plan.days[364])
  }
}

const isMain = process.argv[1]?.includes('generate-mcheyne-plan-json')
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
