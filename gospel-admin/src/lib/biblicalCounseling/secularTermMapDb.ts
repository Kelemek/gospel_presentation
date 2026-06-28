import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  parseSecularTermMapFile,
  parseSecularTermMapForSave,
  applySecularTermMapToGospelData,
  EMPTY_SECULAR_TERM_MAP,
  type SecularTermMapFile,
  validateSecularTermMapAgainstSections,
  type SecularTermMapValidationIssue,
} from '@/lib/biblicalCounseling/secularTermMap'
import { SECULAR_TERM_MAP_SEED } from '@/lib/biblicalCounseling/secularTermMapSeed'
import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import type { GospelSection } from '@/lib/types'

const ADMIN_SETTINGS_ID = 1

export type SecularTermMapSaveResult = {
  map: SecularTermMapFile
  validationIssues: SecularTermMapValidationIssue[]
}

function isEmptySecularTermMap(raw: unknown): boolean {
  if (raw == null) return true
  if (typeof raw !== 'object') return true
  const data = raw as SecularTermMapFile
  return !Array.isArray(data.mappings) || data.mappings.length === 0
}

/** Load map from Supabase; fall back to committed JSON when column is empty. */
export async function loadSecularTermMapFromSupabase(): Promise<SecularTermMapFile> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select('secular_term_map')
      .eq('id', ADMIN_SETTINGS_ID)
      .maybeSingle()

    if (error) {
      logger.error('[secularTermMapDb] Failed to load from Supabase:', error)
      return EMPTY_SECULAR_TERM_MAP
    }

    const raw = (data as { secular_term_map?: unknown } | null)?.secular_term_map
    if (isEmptySecularTermMap(raw)) {
      return EMPTY_SECULAR_TERM_MAP
    }

    return parseSecularTermMapFile(raw)
  } catch (err) {
    logger.error('[secularTermMapDb] Unexpected load error:', err)
    return EMPTY_SECULAR_TERM_MAP
  }
}

export async function saveSecularTermMapToSupabase(
  map: SecularTermMapFile,
  sectionTitles?: GospelSection[]
): Promise<SecularTermMapSaveResult> {
  const parsed = parseSecularTermMapForSave(map)
  const validationIssues = sectionTitles
    ? validateSecularTermMapAgainstSections(parsed, sectionTitles)
    : []

  const admin = createAdminClient()
  const { error } = await (admin.from('admin_settings') as ReturnType<typeof admin.from>).update({
    secular_term_map: parsed,
    updated_at: new Date().toISOString(),
  }).eq('id', ADMIN_SETTINGS_ID)

  if (error) {
    logger.error('[secularTermMapDb] Failed to save:', error)
    throw new Error('Failed to save secular term map')
  }

  return { map: parsed, validationIssues }
}

export async function seedSecularTermMapIfEmpty(force = false): Promise<'seeded' | 'skipped'> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_settings')
    .select('secular_term_map')
    .eq('id', ADMIN_SETTINGS_ID)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read admin_settings: ${error.message}`)
  }

  const raw = (data as { secular_term_map?: unknown } | null)?.secular_term_map
  if (!force && !isEmptySecularTermMap(raw)) {
    return 'skipped'
  }

  const map = SECULAR_TERM_MAP_SEED
  const { error: updateError } = await (admin.from('admin_settings') as ReturnType<typeof admin.from>).update({
    secular_term_map: map,
    updated_at: new Date().toISOString(),
  }).eq('id', ADMIN_SETTINGS_ID)

  if (updateError) {
    throw new Error(`Failed to seed secular_term_map: ${updateError.message}`)
  }

  return 'seeded'
}

const APPLY_ALLOWED_SLUGS = new Set([
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
])

export async function loadBiblicalCounselingSectionTitles(): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('gospel_data')
    .eq('slug', BIBLICAL_COUNSELING_REFERENCE_SLUG)
    .maybeSingle()

  if (error || !data) {
    logger.error('[secularTermMapDb] Failed to load section titles:', error)
    return []
  }

  const sections = (data as { gospel_data: GospelSection[] }).gospel_data
  if (!Array.isArray(sections)) return []
  return sections.map((s) => s.title.trim()).filter(Boolean)
}

export async function applySecularTermMapToProfile(
  slug: string,
  mapOverride?: SecularTermMapFile
): Promise<{ validationIssues: SecularTermMapValidationIssue[] }> {
  if (!APPLY_ALLOWED_SLUGS.has(slug)) {
    throw new Error('Invalid profile slug for secular term map apply')
  }

  const map = mapOverride ?? (await loadSecularTermMapFromSupabase())
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, gospel_data')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !profile) {
    throw new Error(`Profile not found: ${slug}`)
  }

  const gospelData = JSON.parse(JSON.stringify(profile.gospel_data)) as GospelSection[]
  const validationIssues = applySecularTermMapToGospelData(gospelData, map)

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      gospel_data: gospelData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', (profile as { id: string }).id)

  if (updateError) {
    logger.error('[secularTermMapDb] Failed to apply map to profile:', updateError)
    throw new Error('Failed to apply secular term map to profile')
  }

  return { validationIssues }
}
