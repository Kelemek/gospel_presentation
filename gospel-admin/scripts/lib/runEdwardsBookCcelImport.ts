import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { importEdwardsBookToSupabase, type ParsedEdwardsBook } from '../../src/lib/edwardsBooks/importEdwardsBookToSupabase'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

export type EdwardsBookImportConfig = {
  defaultUrl: string
  envUrlKey: string
  slug: string
  purgeFlag: string
  parse: (xml: string) => ParsedEdwardsBook
  describeParsed: (parsed: ParsedEdwardsBook) => void
}

function parseArgs(argv: string[], config: EdwardsBookImportConfig) {
  let parseOnly = false
  let dryRun = false
  let purge = false
  let url = process.env[config.envUrlKey] || config.defaultUrl

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--parse-only') {
      parseOnly = true
      continue
    }
    if (argv[i] === '--dry-run') {
      dryRun = true
      continue
    }
    if (argv[i] === config.purgeFlag) {
      purge = true
      continue
    }
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1]
      i++
    }
  }

  return { parseOnly, dryRun, purge, url }
}

async function purgeProfile(supabase: SupabaseClient, slug: string) {
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

  console.log(`Purged profile ${slug} and passage index rows.`)
}

export async function runEdwardsBookCcelImport(
  argv: string[],
  config: EdwardsBookImportConfig
): Promise<void> {
  const { parseOnly, dryRun, purge, url } = parseArgs(argv, config)

  console.log(`Fetching ${url}…`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const parsed = config.parse(xml)

  config.describeParsed(parsed)

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

  if (purge) {
    await purgeProfile(supabase, config.slug)
  }

  const result = await importEdwardsBookToSupabase(supabase, parsed)
  console.log(
    `${result.action} ${result.slug} (${result.sectionCount} section(s), ${result.subsectionCount} subsections, ${result.passageKeyCount} index keys)`
  )
}
