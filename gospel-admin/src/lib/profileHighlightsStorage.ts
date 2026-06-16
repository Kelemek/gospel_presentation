import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { PROFILE_HIGHLIGHTS_STORAGE_KEY } from '@/lib/gospelClientStoragePolicy'
import { scriptureChapterReferenceKey } from '@/lib/parse-scripture-reference'
import { normalizeScriptureHighlightReference } from '@/lib/scriptureHighlightReference'
import type { ScriptureHighlightColorId } from '@/lib/scriptureHighlightStyles'

export { PROFILE_HIGHLIGHTS_STORAGE_KEY }
export const PROFILE_HIGHLIGHTS_SCHEMA_VERSION = 2

/** Text selection highlight in gospel profile body content. */
export interface ProfileHighlight {
  kind?: 'resource'
  id: string
  slug: string
  resourceTitle: string
  anchorId: string
  locationLabel: string
  scopeId: string
  quote: string
  startOffset: number
  endOffset: number
  createdAt: number
}

/** Reference-based highlight from Bible Reader / passage picker. */
export interface ScriptureHighlight {
  kind: 'scripture'
  id: string
  reference: string
  quote: string
  colorId: ScriptureHighlightColorId
  profileSlug?: string
  resourceTitle?: string
  createdAt: number
}

export type GospelHighlight = ProfileHighlight | ScriptureHighlight

interface StoredShape {
  v: number
  highlights: GospelHighlight[]
}

export function isScriptureHighlight(h: GospelHighlight): h is ScriptureHighlight {
  return h.kind === 'scripture'
}

export function isResourceHighlight(h: GospelHighlight): h is ProfileHighlight {
  return h.kind !== 'scripture'
}

function isValidResourceHighlight(h: unknown): h is ProfileHighlight {
  if (!h || typeof h !== 'object') return false
  const x = h as Record<string, unknown>
  if (x.kind === 'scripture') return false
  return (
    typeof x.id === 'string' &&
    typeof x.slug === 'string' &&
    typeof x.resourceTitle === 'string' &&
    typeof x.anchorId === 'string' &&
    typeof x.locationLabel === 'string' &&
    typeof x.scopeId === 'string' &&
    typeof x.quote === 'string' &&
    typeof x.startOffset === 'number' &&
    typeof x.endOffset === 'number' &&
    Number.isFinite(x.startOffset) &&
    Number.isFinite(x.endOffset) &&
    typeof x.createdAt === 'number'
  )
}

const SCRIPTURE_COLOR_IDS = new Set<string>(['red', 'blue', 'yellow', 'green', 'violet'])

function isValidScriptureHighlight(h: unknown): h is ScriptureHighlight {
  if (!h || typeof h !== 'object') return false
  const x = h as Record<string, unknown>
  if (x.kind !== 'scripture') return false
  return (
    typeof x.id === 'string' &&
    typeof x.reference === 'string' &&
    typeof x.quote === 'string' &&
    typeof x.colorId === 'string' &&
    SCRIPTURE_COLOR_IDS.has(x.colorId) &&
    typeof x.createdAt === 'number' &&
    (x.profileSlug === undefined || typeof x.profileSlug === 'string') &&
    (x.resourceTitle === undefined || typeof x.resourceTitle === 'string')
  )
}

function isValidHighlight(h: unknown): h is GospelHighlight {
  return isValidResourceHighlight(h) || isValidScriptureHighlight(h)
}

function migrateStoredShape(parsed: { v?: number; highlights?: unknown }): GospelHighlight[] {
  if (!parsed || !Array.isArray(parsed.highlights)) return []
  if (parsed.v === 1 || parsed.v === PROFILE_HIGHLIGHTS_SCHEMA_VERSION) {
    return parsed.highlights.filter(isValidHighlight)
  }
  return []
}

export function loadHighlights(): GospelHighlight[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = gospelStorageGetSync(PROFILE_HIGHLIGHTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredShape
    return migrateStoredShape(parsed)
  } catch {
    return []
  }
}

export function loadResourceHighlights(): ProfileHighlight[] {
  return loadHighlights().filter(isResourceHighlight)
}

export function loadScriptureHighlights(): ScriptureHighlight[] {
  return loadHighlights().filter(isScriptureHighlight)
}

function persist(highlights: GospelHighlight[]): boolean {
  if (typeof window === 'undefined') return false
  const payload: StoredShape = { v: PROFILE_HIGHLIGHTS_SCHEMA_VERSION, highlights }
  return gospelStorageSetSync(PROFILE_HIGHLIGHTS_STORAGE_KEY, JSON.stringify(payload))
}

function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function highlightsForSlug(slug: string): ProfileHighlight[] {
  return loadResourceHighlights().filter((h) => h.slug === slug)
}

/** Returns false if duplicate (same scope + range) or storage failed. */
export function addHighlight(
  entry: Omit<ProfileHighlight, 'id' | 'createdAt' | 'kind'>
): ProfileHighlight | null {
  const list = loadHighlights()
  const dup = list.some(
    (h) =>
      isResourceHighlight(h) &&
      h.slug === entry.slug &&
      h.scopeId === entry.scopeId &&
      h.startOffset === entry.startOffset &&
      h.endOffset === entry.endOffset
  )
  if (dup) return null
  const next: ProfileHighlight = { ...entry, id: nextId(), createdAt: Date.now() }
  if (!persist([next, ...list])) return null
  return next
}

export function getScriptureHighlightForReference(reference: string): ScriptureHighlight | null {
  const normalized = normalizeScriptureHighlightReference(reference)
  if (!normalized) return null
  return (
    loadScriptureHighlights().find(
      (h) => normalizeScriptureHighlightReference(h.reference) === normalized
    ) ?? null
  )
}

/**
 * Upsert scripture highlight for normalized reference, or remove when toggling same color off.
 * Returns null when removed or storage failed; otherwise the saved highlight.
 */
export function toggleScriptureHighlight(
  entry: Omit<ScriptureHighlight, 'id' | 'createdAt' | 'kind'> & { reference: string }
): ScriptureHighlight | null {
  const normalized = normalizeScriptureHighlightReference(entry.reference)
  if (!normalized) return null

  const list = loadHighlights()
  const existingIndex = list.findIndex(
    (h) =>
      isScriptureHighlight(h) &&
      normalizeScriptureHighlightReference(h.reference) === normalized
  )
  const existing =
    existingIndex >= 0 && isScriptureHighlight(list[existingIndex]!)
      ? list[existingIndex]!
      : null

  if (existing && existing.colorId === entry.colorId) {
    const next = list.filter((_, i) => i !== existingIndex)
    persist(next)
    return null
  }

  const saved: ScriptureHighlight = {
    kind: 'scripture',
    id: existing?.id ?? nextId(),
    reference: normalized,
    quote: entry.quote,
    colorId: entry.colorId,
    ...(entry.profileSlug ? { profileSlug: entry.profileSlug } : {}),
    ...(entry.resourceTitle ? { resourceTitle: entry.resourceTitle } : {}),
    createdAt: existing?.createdAt ?? Date.now(),
  }

  const withoutDup = list.filter(
    (h) =>
      !(
        isScriptureHighlight(h) &&
        normalizeScriptureHighlightReference(h.reference) === normalized
      )
  )
  if (!persist([saved, ...withoutDup])) return null
  return saved
}

export function removeHighlight(id: string): void {
  const next = loadHighlights().filter((h) => h.id !== id)
  persist(next)
}

export function scriptureHighlightsForChapter(
  book: string,
  chapter: number
): ScriptureHighlight[] {
  const key = scriptureChapterReferenceKey(`${book} ${chapter}`)
  if (!key) return []
  return loadScriptureHighlights().filter((h) => {
    const chapterKey = scriptureChapterReferenceKey(h.reference)
    return chapterKey === key
  })
}
