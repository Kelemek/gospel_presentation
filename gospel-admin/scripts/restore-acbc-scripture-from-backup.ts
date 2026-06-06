#!/usr/bin/env npx tsx
/**
 * Merge scripture cards from the latest Supabase Storage full backup into a profile.
 * Restores originals wiped by an ACBC scripture sync without removing newer ACBC-derived refs.
 *
 * Usage (from gospel-admin/):
 *   npx tsx scripts/restore-acbc-scripture-from-backup.ts
 *   npx tsx scripts/restore-acbc-scripture-from-backup.ts --slug 26b974ef --dry-run
 */
import { gunzipSync } from 'zlib'

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { normalizeAcbcSectionTitleKey } from '../src/lib/acbc/acbcCuratedScriptureRefs'
import { mergeScriptureReferenceLists } from '../src/lib/acbc/acbcScriptureIndexSync'
import type { GospelSection, ScriptureReference } from '../src/lib/types'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const PROFILE_SLUG = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : '26b974ef'
const DRY_RUN = args.includes('--dry-run')

/** Backup section title → live profile section title when renamed. */
const BACKUP_SECTION_TITLE_ALIASES: Record<string, string> = {
  anxiety: 'Anxiety and Worry',
  worry: 'Anxiety and Worry',
}

const BUCKET = 'db-backups'

async function downloadText(
  sb: ReturnType<typeof createClient>,
  objectPath: string
): Promise<string> {
  const { data, error } = await sb.storage.from(BUCKET).download(objectPath)
  if (error || !data) throw new Error(`download ${objectPath}: ${error?.message ?? 'unknown'}`)
  const buf = Buffer.from(await data.arrayBuffer())
  return objectPath.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8')
}

async function loadProfileFromLatestFullBackup(
  sb: ReturnType<typeof createClient>,
  slug: string
): Promise<{ gospelData: GospelSection[]; manifestPath: string }> {
  const pointer = JSON.parse(await downloadText(sb, 'latest/latest-backup.json')) as {
    manifest_path: string
  }
  const manifest = JSON.parse(await downloadText(sb, pointer.manifest_path)) as {
    tables: { profiles: string | string[] }
  }
  const shards = Array.isArray(manifest.tables.profiles)
    ? manifest.tables.profiles
    : [manifest.tables.profiles]

  for (const shardPath of shards) {
    const shard = JSON.parse(await downloadText(sb, shardPath)) as {
      rows?: Array<{ slug?: string; gospel_data?: GospelSection[] }>
    }
    const row = shard.rows?.find((r) => r.slug === slug)
    if (row?.gospel_data) {
      return { gospelData: row.gospel_data, manifestPath: pointer.manifest_path }
    }
  }
  throw new Error(`Profile ${slug} not found in backup ${pointer.manifest_path}`)
}

function liveSectionKeyForBackupTitle(backupTitle: string): string {
  const lower = normalizeAcbcSectionTitleKey(backupTitle)
  const aliased = BACKUP_SECTION_TITLE_ALIASES[lower]
  return normalizeAcbcSectionTitleKey(aliased ?? backupTitle)
}

function backupRefsByLiveSectionKey(
  backupGospelData: GospelSection[]
): Map<string, ScriptureReference[]> {
  const byKey = new Map<string, ScriptureReference[]>()
  for (const section of backupGospelData) {
    const title = (section.title || '').trim()
    if (!title) continue
    const refs = section.subsections?.[0]?.scriptureReferences ?? []
    if (refs.length === 0) continue
    const key = liveSectionKeyForBackupTitle(title)
    const existing = byKey.get(key) ?? []
    byKey.set(key, mergeScriptureReferenceLists(existing, refs))
  }
  return byKey
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, serviceKey)
  const { gospelData: backupGospelData, manifestPath } = await loadProfileFromLatestFullBackup(
    sb,
    PROFILE_SLUG
  )
  const backupBySection = backupRefsByLiveSectionKey(backupGospelData)

  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, title, gospel_data')
    .eq('slug', PROFILE_SLUG)
    .single()

  if (error || !profile) {
    console.error('Profile not found:', PROFILE_SLUG, error)
    process.exit(1)
  }

  const gospelData = profile.gospel_data as GospelSection[]
  const changes: { title: string; before: number; after: number; added: string[] }[] = []

  for (const section of gospelData) {
    const title = (section.title || '').trim()
    const backupRefs = backupBySection.get(normalizeAcbcSectionTitleKey(title))
    if (!backupRefs?.length) continue

    const sub = section.subsections?.[0]
    if (!sub) continue

    const before = sub.scriptureReferences?.length ?? 0
    const merged = mergeScriptureReferenceLists(backupRefs, sub.scriptureReferences)
    const after = merged.length
    const beforeRefs = new Set((sub.scriptureReferences ?? []).map((r) => r.reference))
    const added = merged.map((r) => r.reference).filter((r) => !beforeRefs.has(r))

    if (added.length === 0) continue

    sub.scriptureReferences = merged
    changes.push({ title, before, after, added })
  }

  console.log(`Profile: ${profile.title} (${PROFILE_SLUG})`)
  console.log(`Backup: ${manifestPath}`)
  if (DRY_RUN) console.log('DRY RUN — no database writes\n')

  if (changes.length === 0) {
    console.log('No scripture cards to restore (live already has backup refs).')
    return
  }

  for (const row of changes) {
    console.log(`  ${row.title}: ${row.before} → ${row.after} (+${row.added.length})`)
    for (const ref of row.added) console.log(`    + ${ref}`)
  }

  if (!DRY_RUN) {
    const { error: updateError } = await sb
      .from('profiles')
      .update({ gospel_data: gospelData })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Update failed:', updateError)
      process.exit(1)
    }
    console.log('\nSaved gospel_data to Supabase.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
