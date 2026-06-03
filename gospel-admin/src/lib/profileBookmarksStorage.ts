import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/gospelClientStoragePolicy'

export { PROFILE_BOOKMARKS_STORAGE_KEY }
export const PROFILE_BOOKMARKS_SCHEMA_VERSION = 2

export interface ProfileBookmark {
  id: string
  slug: string
  resourceTitle: string
  anchorId: string
  locationLabel: string
  createdAt: number
  /** Collapsed plain-text offset inside anchor (Listen model). Omitted in legacy bookmarks. */
  plainOffset?: number
  fingerprint?: string
  /** Short preview for the bookmarks list. */
  excerpt?: string
}

interface StoredShape {
  v: number
  bookmarks: ProfileBookmark[]
}

function isValidBookmark(b: unknown): b is ProfileBookmark {
  if (!b || typeof b !== 'object') return false
  const x = b as Record<string, unknown>
  if (
    typeof x.id !== 'string' ||
    typeof x.slug !== 'string' ||
    typeof x.anchorId !== 'string' ||
    typeof x.resourceTitle !== 'string' ||
    typeof x.locationLabel !== 'string' ||
    typeof x.createdAt !== 'number'
  ) {
    return false
  }
  if (x.plainOffset !== undefined && typeof x.plainOffset !== 'number') return false
  if (x.fingerprint !== undefined && typeof x.fingerprint !== 'string') return false
  if (x.excerpt !== undefined && typeof x.excerpt !== 'string') return false
  return true
}

export function loadBookmarks(): ProfileBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = gospelStorageGetSync(PROFILE_BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredShape
    if (
      !parsed ||
      (parsed.v !== 1 && parsed.v !== PROFILE_BOOKMARKS_SCHEMA_VERSION) ||
      !Array.isArray(parsed.bookmarks)
    ) {
      return []
    }
    return parsed.bookmarks.filter(isValidBookmark)
  } catch {
    return []
  }
}

function persist(bookmarks: ProfileBookmark[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredShape = {
      v: PROFILE_BOOKMARKS_SCHEMA_VERSION,
      bookmarks,
    }
    gospelStorageSetSync(PROFILE_BOOKMARKS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}

function bookmarkPositionKey(b: Pick<ProfileBookmark, 'slug' | 'anchorId' | 'plainOffset'>): string {
  const offsetPart =
    typeof b.plainOffset === 'number' && Number.isFinite(b.plainOffset)
      ? String(b.plainOffset)
      : 'legacy'
  return `${b.slug}\0${b.anchorId}\0${offsetPart}`
}

/** Returns false if duplicate slug+anchor+offset or storage failed. */
export function addBookmark(entry: Omit<ProfileBookmark, 'id' | 'createdAt'>): boolean {
  const list = loadBookmarks()
  const key = bookmarkPositionKey(entry)
  const dup = list.some((b) => bookmarkPositionKey(b) === key)
  if (dup) return false
  const next: ProfileBookmark = {
    ...entry,
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    createdAt: Date.now(),
  }
  persist([next, ...list])
  return true
}

export function removeBookmark(id: string): void {
  const list = loadBookmarks().filter((b) => b.id !== id)
  persist(list)
}
