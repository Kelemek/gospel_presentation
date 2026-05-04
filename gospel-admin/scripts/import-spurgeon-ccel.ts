/**
 * Import Spurgeon sermons from a CCEL ThML volume XML file into Supabase profiles + spurgeon_passage_index.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/import-spurgeon-ccel.ts --limit 5
 *   npx tsx scripts/import-spurgeon-ccel.ts --limit 5 --url https://www.ccel.org/ccel/spurgeon/sermons01.xml
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import type { GospelPresentationData } from '../src/lib/types'
import { parseCcelVolumeSermons } from '../src/lib/spurgeon/ccelSermonHtml'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

function parseArgs(argv: string[]) {
  let limit = 5
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
  }
  return { limit, url }
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const { limit, url } = parseArgs(process.argv.slice(2))
  console.log(`Fetching ${url} (limit ${limit} sermons)…`)

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`HTTP ${res.status} fetching volume XML`)
    process.exit(1)
  }
  const xml = await res.text()
  const sermons = parseCcelVolumeSermons(xml, { limit })
  console.log(`Parsed ${sermons.length} sermon(s).`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  for (const sermon of sermons) {
    const gospelData: GospelPresentationData = [sermon.gospelSection]

    const { data: existing, error: selErr } = await supabase
      .from('profiles')
      .select('id,is_public')
      .eq('slug', sermon.slug)
      .maybeSingle()

    if (selErr) {
      console.error(`Lookup ${sermon.slug}:`, selErr)
      process.exit(1)
    }

    const keepPublic = existing?.is_public === true
    const nextPublic = keepPublic

    let profileId: string

    if (existing?.id) {
      profileId = existing.id
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          title: sermon.sermonTitle,
          description: null,
          gospel_data: gospelData as never,
          is_template: true,
          is_public: nextPublic,
          include_in_resources_menu: false,
        })
        .eq('id', profileId)

      if (upErr) {
        console.error(`Update ${sermon.slug}:`, upErr)
        process.exit(1)
      }
      console.log(`Updated profile ${sermon.slug}`)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('profiles')
        .insert({
          slug: sermon.slug,
          title: sermon.sermonTitle,
          description: null,
          gospel_data: gospelData as never,
          is_template: true,
          is_public: false,
          include_in_resources_menu: false,
        })
        .select('id')
        .single()

      if (insErr || !inserted?.id) {
        console.error(`Insert ${sermon.slug}:`, insErr)
        process.exit(1)
      }
      profileId = inserted.id
      console.log(`Inserted profile ${sermon.slug}`)
    }

    const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
    if (delErr) {
      console.error(`Clear index for ${sermon.slug}:`, delErr)
      process.exit(1)
    }

    const keys = sermon.passageKeys
    if (keys.length > 0) {
      const rows = keys.map((passage_key, i) => ({
        passage_key,
        profile_id: profileId,
        sermon_no: sermon.sermonNo,
        is_primary: i === 0,
      }))
      const { error: idxErr } = await supabase.from('spurgeon_passage_index').insert(rows)
      if (idxErr) {
        console.error(`Index ${sermon.slug}:`, idxErr)
        process.exit(1)
      }
      console.log(`  Indexed ${keys.length} passage key(s)`)
    } else {
      console.log('  No passage keys extracted')
    }
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
