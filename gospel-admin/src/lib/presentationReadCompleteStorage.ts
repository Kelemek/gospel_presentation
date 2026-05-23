import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'

/** Slugs the user has read to the end (Listen through last anchor or scrolled to bottom). Device-only. */
export const PRESENTATION_READ_COMPLETE_STORAGE_KEY = 'gospel-presentation-read-complete:v1'

export const GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT = 'gospel-presentation-read-status-changed' as const

export interface GospelPresentationReadStatusChangedDetail {
  slug: string
  read: boolean
}

const SCHEMA_V = 1

interface StoredShape {
  v: number
  slugs: string[]
}

function parseStored(raw: string | null): string[] {
  if (raw == null || raw === '') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    const o = parsed as Record<string, unknown>
    if (o.v !== SCHEMA_V || !Array.isArray(o.slugs)) return []
    return o.slugs.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
  } catch {
    return []
  }
}

function writeSlugs(slugs: string[]): void {
  if (typeof window === 'undefined') return
  try {
    const unique = [...new Set(slugs)]
    gospelStorageSetSync(
      PRESENTATION_READ_COMPLETE_STORAGE_KEY,
      JSON.stringify({ v: SCHEMA_V, slugs: unique } satisfies StoredShape)
    )
  } catch {
    /* private mode / quota */
  }
}

function emitReadStatus(slug: string, read: boolean): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<GospelPresentationReadStatusChangedDetail>(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, {
      detail: { slug, read },
    })
  )
}

export function loadPresentationReadCompleteSlugs(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return parseStored(gospelStorageGetSync(PRESENTATION_READ_COMPLETE_STORAGE_KEY))
  } catch {
    return []
  }
}

export function isPresentationReadComplete(slug: string): boolean {
  if (!slug.trim()) return false
  return loadPresentationReadCompleteSlugs().includes(slug)
}

export function addPresentationReadCompleteSlug(slug: string): void {
  const s = slug.trim()
  if (!s) return
  const prev = loadPresentationReadCompleteSlugs()
  if (prev.includes(s)) return
  writeSlugs([...prev, s])
  emitReadStatus(s, true)
}

export function removePresentationReadCompleteSlug(slug: string): void {
  const s = slug.trim()
  if (!s) return
  const prev = loadPresentationReadCompleteSlugs()
  if (!prev.includes(s)) return
  writeSlugs(prev.filter((x) => x !== s))
  emitReadStatus(s, false)
}
