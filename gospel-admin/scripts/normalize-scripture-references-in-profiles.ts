/**
 * Normalize abbreviated inline scripture in profile gospel_data and rebuild spurgeon_passage_index.
 *
 * Requires gospel-admin/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage (from gospel-admin/):
 *   npm run normalize-scripture-refs -- --dry-run
 *   npm run normalize-scripture-refs -- --slug je03 --verbose
 *   npm run normalize-scripture-refs -- --slug-like 'je%' --limit 5
 *   npm run normalize-scripture-refs -- --reindex-only --slug-like 'sg%'
 *   npm run normalize-scripture-refs -- --include-non-templates --slug my-profile
 *   npm run normalize-scripture-refs -- --slug je08 --bump-updated-at
 *   npm run normalize-scripture-refs -- --slug-like 'je%' --audit
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { edwardsSermonNumberFromSlug, isEdwardsSermonProfileSlug } from '../src/lib/edwards/edwardsSlug'
import { profileDbTouchFields } from '../src/lib/profileDbTouch'
import {
  auditGospelPresentationData,
  normalizeGospelPresentationData,
  type ScriptureAuditIssue,
} from '../src/lib/scriptureReferenceNormalize'
import { passageKeysFromGospelPresentationData, sermonNumberFromSgSlug } from '../src/lib/spurgeon/passageKeysFromGospelData'
import type { GospelPresentationData } from '../src/lib/types'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PAGE = 80

type CliArgs = {
  dryRun: boolean
  verbose: boolean
  limitProfiles: number | null
  slug: string | null
  slugLike: string | null
  templateOnly: boolean
  reindexOnly: boolean
  bumpUpdatedAt: boolean
  auditOnly: boolean
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false
  let verbose = false
  let limitProfiles: number | null = null
  let slug: string | null = null
  let slugLike: string | null = null
  let templateOnly = true
  let reindexOnly = false
  let bumpUpdatedAt = false
  let auditOnly = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') dryRun = true
    else if (a === '--verbose') verbose = true
    else if (a === '--audit') auditOnly = true
    else if (a === '--reindex-only') reindexOnly = true
    else if (a === '--bump-updated-at') bumpUpdatedAt = true
    else if (a === '--include-non-templates') templateOnly = false
    else if (a === '--limit' && argv[i + 1]) {
      limitProfiles = Math.max(1, parseInt(argv[i + 1], 10) || 1)
      i++
    } else if (a === '--slug' && argv[i + 1]) {
      slug = argv[i + 1].trim()
      i++
    } else if (a === '--slug-like' && argv[i + 1]) {
      slugLike = argv[i + 1].trim()
      i++
    }
  }

  return { dryRun, verbose, limitProfiles, slug, slugLike, templateOnly, reindexOnly, bumpUpdatedAt, auditOnly }
}

function printAuditIssues(slug: string, issues: ScriptureAuditIssue[], verbose: boolean): void {
  if (issues.length === 0) return
  console.log(`${slug}: ${issues.length} remaining scripture issue(s)`)
  const show = verbose ? issues : issues.slice(0, 8)
  for (const issue of show) {
    console.log(`  [${issue.reason}] ${issue.field}: "${issue.match}"`)
  }
  if (!verbose && issues.length > show.length) {
    console.log(`  … and ${issues.length - show.length} more (use --verbose)`)
  }
}

function sermonNoForProfileSlug(slug: string): number | null {
  const sg = sermonNumberFromSgSlug(slug)
  if (sg !== null) return sg
  if (isEdwardsSermonProfileSlug(slug)) {
    const n = edwardsSermonNumberFromSlug(slug)
    return n === Number.MAX_SAFE_INTEGER ? null : n
  }
  return null
}

type PassageIndexInsertRow = {
  passage_key: string
  profile_id: string
  sermon_no: number | null
  is_primary: boolean
}

async function rebuildPassageIndex(
  supabase: SupabaseClient,
  profileId: string,
  slug: string,
  gospelData: GospelPresentationData,
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  const keys = passageKeysFromGospelPresentationData(gospelData)
  const sermonNo = sermonNoForProfileSlug(slug)

  if (verbose) {
    console.log(`  index: ${keys.length} key(s)${keys.length ? `: ${keys.slice(0, 12).join(', ')}${keys.length > 12 ? '…' : ''}` : ''}`)
  }

  if (dryRun) return keys.length

  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index for ${slug}: ${JSON.stringify(delErr)}`)
  }

  if (keys.length === 0) return 0

  const rows: PassageIndexInsertRow[] = keys.map((passage_key, i) => ({
    passage_key,
    profile_id: profileId,
    sermon_no: sermonNo,
    is_primary: i === 0,
  }))

  const { error: insErr } = await supabase.from('spurgeon_passage_index').insert(rows as never)
  if (insErr) {
    throw new Error(`Insert index for ${slug}: ${JSON.stringify(insErr)}`)
  }

  return keys.length
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
    process.exit(1)
  }

  const args = parseArgs(process.argv.slice(2))
  const supabase = createClient(url, key)

  let from = 0
  let totalProfiles = 0
  let totalUpdated = 0
  let totalReindexed = 0
  let totalReplacements = 0
  let totalUnchanged = 0
  let totalAuditIssues = 0

  for (;;) {
    const to = from + PAGE - 1
    let q = supabase
      .from('profiles')
      .select('id, slug, gospel_data')
      .order('slug', { ascending: true })
      .range(from, to)

    if (args.slug) {
      q = q.eq('slug', args.slug)
    } else if (args.slugLike) {
      q = q.like('slug', args.slugLike)
    }
    if (args.templateOnly) {
      q = q.eq('is_template', true)
    }

    const { data: rows, error } = await q
    if (error) {
      console.error('profiles fetch:', error)
      process.exit(1)
    }
    if (!rows?.length) break

    for (const row of rows) {
      if (args.limitProfiles !== null && totalProfiles >= args.limitProfiles) {
        from = 1e9
        break
      }
      totalProfiles++

      const slug = String(row.slug)
      const raw = (row as { gospel_data: unknown }).gospel_data
      const gospelDataIn = (Array.isArray(raw) ? raw : []) as GospelPresentationData

      const { data: gospelDataOut, changed, replacements } = args.reindexOnly
        ? { data: gospelDataIn, changed: false, replacements: [] }
        : normalizeGospelPresentationData(gospelDataIn)

      const auditIssues = auditGospelPresentationData(gospelDataOut)
      totalAuditIssues += auditIssues.length
      if (auditIssues.length > 0) {
        printAuditIssues(slug, auditIssues, args.verbose)
      }

      if (args.auditOnly) {
        continue
      }

      const needsGospelUpdate = !args.reindexOnly && changed
      const needsReindex = needsGospelUpdate || args.reindexOnly

      if (!needsGospelUpdate && !args.reindexOnly) {
        if (args.bumpUpdatedAt) {
          if (!args.dryRun) {
            const { error: touchErr } = await supabase
              .from('profiles')
              .update(profileDbTouchFields())
              .eq('id', row.id)
            if (touchErr) {
              console.error(`${slug}: bump updated_at`, touchErr)
              process.exit(1)
            }
          }
          if (args.verbose) console.log(`${slug}: bumped updated_at (cache refresh)`)
          totalUpdated++
        } else {
          totalUnchanged++
          if (args.verbose) console.log(`${slug}: no scripture text changes`)
        }
        continue
      }

      if (args.verbose && replacements.length > 0) {
        for (const r of replacements) {
          console.log(`  ${r.field}: "${r.from}" → "${r.to}"`)
        }
      } else if (replacements.length > 0) {
        console.log(`${slug}: ${replacements.length} replacement(s)`)
      } else if (args.reindexOnly) {
        console.log(`${slug}: reindex only`)
      }

      if (!args.dryRun && needsGospelUpdate) {
        const { error: upErr } = await supabase
          .from('profiles')
          .update({ gospel_data: gospelDataOut as never, ...profileDbTouchFields() })
          .eq('id', row.id)
        if (upErr) {
          console.error(`${slug}: gospel_data update`, upErr)
          process.exit(1)
        }
        totalUpdated++
      } else if (needsGospelUpdate) {
        totalUpdated++
      }

      if (needsReindex) {
        const keyCount = await rebuildPassageIndex(
          supabase,
          row.id,
          slug,
          gospelDataOut,
          args.dryRun,
          args.verbose
        )
        totalReindexed++
        if (!args.dryRun || args.verbose) {
          console.log(
            `${slug}: ${args.dryRun ? 'would rebuild' : 'rebuilt'} index (${keyCount} key(s))`
          )
        }
      }

      totalReplacements += replacements.length
    }

    if (args.slug) break
    if (args.limitProfiles !== null && totalProfiles >= args.limitProfiles) break
    if (!rows || rows.length < PAGE) break
    from += PAGE
  }

  const mode = args.dryRun ? '[dry-run] ' : ''
  const reindexNote = args.reindexOnly ? ' (reindex-only) ' : args.auditOnly ? ' (audit-only) ' : ' '
  console.log(
    `${mode}Scanned ${totalProfiles} profile(s).${reindexNote}` +
      `Text updates: ${totalUpdated}; index rebuilds: ${totalReindexed}; ` +
      `replacements: ${totalReplacements}; unchanged: ${totalUnchanged}; ` +
      `audit issues: ${totalAuditIssues}.`
  )
  if (totalAuditIssues > 0 && !args.auditOnly) {
    console.log(
      'Some refs still need aliases or manual fix (run with --audit --verbose for full list).'
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
