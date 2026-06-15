/**
 * Import CCEL *Systematic Theology* (Charles Hodge) into Supabase (`chst1`–`chst3`).
 *
 * Usage (from gospel-admin/):
 *   npm run import-hodge -- --parse-only
 *   npm run import-hodge -- --volume 2 --parse-only
 *   npm run import-hodge -- --dry-run
 *   npm run import-hodge
 *   npm run import-hodge -- --purge-chst
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  inventoryHodgeThml,
  parseCcelHodgeVolumeXml,
  subsectionCountForHodge,
} from '../src/lib/hodge/ccelHodgeHtml'
import {
  allHodgeVolumeIds,
  type HodgeCcelVolumeDef,
  hodgeVolumeById,
} from '../src/lib/hodge/hodgeCcelManifest'
import { importHodgeVolumeToSupabase } from '../src/lib/hodge/importHodgeVolumeToSupabase'
import type { HodgeVolumeId } from '../src/lib/hodge/hodgeSlug'
import { HODGE_ST_VOLUME_SLUGS } from '../src/lib/hodge/hodgeSlug'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

function parseArgs(argv: string[]) {
  let parseOnly = false
  let dryRun = false
  let purgeChst = false
  let volume: HodgeVolumeId | null = null

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === '--purge-chst') {
      purgeChst = true
      continue
    }
    if (argv[i] === '--volume' && argv[i + 1]) {
      volume = Number(argv[i + 1]) as HodgeVolumeId
      i++
    }
  }

  return { parseOnly, dryRun, purgeChst, volume }
}

function volumesToProcess(volume: HodgeVolumeId | null): HodgeCcelVolumeDef[] {
  if (volume != null) {
    return [hodgeVolumeById(volume)]
  }
  return allHodgeVolumeIds().map((v) => hodgeVolumeById(v))
}

async function purgeHodgeProfiles(supabase: SupabaseClient, slugs: string[]) {
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

async function fetchAndParse(vol: HodgeCcelVolumeDef) {
  console.log(`Fetching ${vol.xmlUrl}…`)
  const res = await fetch(vol.xmlUrl)
  if (!res.ok) {
    throw new Error(`Fetch volume ${vol.volume} failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = parseCcelHodgeVolumeXml(xml, vol)
  const subCount = subsectionCountForHodge(parsed.gospelData)
  const jsonBytes = Buffer.byteLength(JSON.stringify(parsed.gospelData), 'utf8')
  console.log(
    `  ${parsed.slug}: ${parsed.gospelData.length} section(s), ${subCount} subsection(s), ${parsed.passageKeys.length} passage key(s), gospel_data ~${(jsonBytes / 1024 / 1024).toFixed(2)} MB`
  )
  if (parsed.passageKeys.length > 0) {
    const sample = parsed.passageKeys.slice(0, 6)
    console.log(`    keys sample: ${sample.join(', ')}${parsed.passageKeys.length > 6 ? '…' : ''}`)
  }
  return parsed
}

async function main() {
  const { parseOnly, dryRun, purgeChst, volume } = parseArgs(process.argv.slice(2))

  if (volume != null && !allHodgeVolumeIds().includes(volume)) {
    throw new Error(`Unknown --volume ${volume}. Expected 1, 2, or 3.`)
  }

  const volumes = volumesToProcess(volume)

  if (parseOnly) {
    for (const vol of volumes) {
      console.log(`\nVolume ${vol.volume}: ${vol.xmlUrl}`)
      const res = await fetch(vol.xmlUrl)
      if (!res.ok) {
        throw new Error(`Fetch volume ${vol.volume} failed: ${res.status}`)
      }
      const xml = await res.text()
      const inv = inventoryHodgeThml(xml)
      console.log(`ThML div1 count: ${inv.div1Count}`)
      for (const sec of inv.sections) {
        console.log(
          `  ${sec.title}: div2=${sec.div2Count}, div3=${sec.div3Count}, subsections≈${sec.subsectionCount}`
        )
      }
    }
    return
  }

  if (!dryRun && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL (.env.local)')
  }

  const supabase = dryRun
    ? null
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  if (purgeChst) {
    if (!supabase) {
      throw new Error('--purge-chst requires Supabase env (not compatible with --dry-run)')
    }
    const slugs = volume != null ? [hodgeVolumeById(volume).slug] : [...HODGE_ST_VOLUME_SLUGS]
    await purgeHodgeProfiles(supabase, slugs)
    if (!dryRun && volumes.length === 0) return
  }

  for (const vol of volumes) {
    const parsed = await fetchAndParse(vol)
    if (dryRun) continue
    if (!supabase) {
      throw new Error('Supabase client required')
    }
    const result = await importHodgeVolumeToSupabase(supabase, parsed)
    console.log(
      `${result.action} ${result.slug} (${result.sectionCount} sections, ${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
