export const PROFILE_HIGHLIGHTS_STORAGE_KEY = 'gospel-profile-highlights'
export const PROFILE_HIGHLIGHTS_SCHEMA_VERSION = 1

export interface ProfileHighlight {
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

interface StoredShape {
  v: number
  highlights: ProfileHighlight[]
}

function isValidHighlight(h: unknown): h is ProfileHighlight {
  if (!h || typeof h !== 'object') return false
  const x = h as Record<string, unknown>
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

export function loadHighlights(): ProfileHighlight[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROFILE_HIGHLIGHTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredShape
    if (!parsed || parsed.v !== PROFILE_HIGHLIGHTS_SCHEMA_VERSION || !Array.isArray(parsed.highlights)) return []
    return parsed.highlights.filter(isValidHighlight)
  } catch {
    return []
  }
}

function persist(highlights: ProfileHighlight[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: StoredShape = { v: PROFILE_HIGHLIGHTS_SCHEMA_VERSION, highlights }
    window.localStorage.setItem(PROFILE_HIGHLIGHTS_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function highlightsForSlug(slug: string): ProfileHighlight[] {
  return loadHighlights().filter((h) => h.slug === slug)
}

/** Returns false if duplicate (same scope + range) or storage failed. */
export function addHighlight(
  entry: Omit<ProfileHighlight, 'id' | 'createdAt'>
): ProfileHighlight | null {
  const list = loadHighlights()
  const dup = list.some(
    (h) =>
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

export function removeHighlight(id: string): void {
  const next = loadHighlights().filter((h) => h.id !== id)
  persist(next)
}

