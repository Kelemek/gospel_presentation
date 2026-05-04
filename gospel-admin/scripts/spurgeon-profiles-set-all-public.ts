/**
 * Set `is_public: true` on every Met Tab-style Spurgeon profile (`slug` matches `sg` + five digits).
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 *   npm run spurgeon-set-all-public -- --dry-run
 *   npm run spurgeon-set-all-public
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const SG_MET_TAB_SLUG = /^sg\d{5}$/

function parseArgs(argv: string[]) {
  let dryRun = false
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true
  }
  return { dryRun }
}

async function collectTargetIds(supabase: SupabaseClient): Promise<{ id: string; slug: string }[]> {
  const out: { id: string; slug: string }[] = []
  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,slug,is_public')
      .like('slug', 'sg%')
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`List profiles: ${JSON.stringify(error)}`)
    }
    if (!data?.length) break
    for (const row of data) {
      const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
      if (!SG_MET_TAB_SLUG.test(slug)) continue
      if (row.is_public === true) continue
      if (typeof row.id === 'string') out.push({ id: row.id, slug })
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return out
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const targets = await collectTargetIds(supabase)
  console.log(
    `${dryRun ? '[dry-run] ' : ''}Met Tab-style profiles (sg#####) not yet public: ${targets.length}`
  )

  if (targets.length === 0) {
    console.log('Nothing to update.')
    return
  }

  if (dryRun) {
    const sample = targets.slice(0, 15).map((t) => t.slug)
    console.log(`Sample slugs: ${sample.join(', ')}${targets.length > 15 ? ' …' : ''}`)
    console.log('Dry-run done (no database writes).')
    return
  }

  const batchSize = 200
  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize).map((t) => t.id)
    const { error } = await supabase.from('profiles').update({ is_public: true }).in('id', batch)
    if (error) {
      throw new Error(`Batch update: ${JSON.stringify(error)}`)
    }
    console.log(`Updated ${Math.min(i + batchSize, targets.length)} / ${targets.length}`)
  }

  console.log(`Done. Set is_public=true on ${targets.length} profile(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
