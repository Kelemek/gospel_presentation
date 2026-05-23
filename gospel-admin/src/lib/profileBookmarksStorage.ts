import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'

export const PROFILE_BOOKMARKS_STORAGE_KEY = 'gospel-profile-bookmarks'
export const PROFILE_BOOKMARKS_SCHEMA_VERSION = 1

export interface ProfileBookmark {
  id: string
  slug: string
  resourceTitle: string
  anchorId: string
  locationLabel: string
  createdAt: number
}

interface StoredShape {
  v: number
  bookmarks: ProfileBookmark[]
}

export function loadBookmarks(): ProfileBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = gospelStorageGetSync(PROFILE_BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredShape
    if (!parsed || parsed.v !== PROFILE_BOOKMARKS_SCHEMA_VERSION || !Array.isArray(parsed.bookmarks)) {
      return []
    }
    return parsed.bookmarks.filter(
      (b) =>
        b &&
        typeof b.id === 'string' &&
        typeof b.slug === 'string' &&
        typeof b.anchorId === 'string' &&
        typeof b.resourceTitle === 'string' &&
        typeof b.locationLabel === 'string' &&
        typeof b.createdAt === 'number'
    )
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

/** Returns false if duplicate slug+anchor or storage failed. */
export function addBookmark(entry: Omit<ProfileBookmark, 'id' | 'createdAt'>): boolean {
  const list = loadBookmarks()
  const dup = list.some((b) => b.slug === entry.slug && b.anchorId === entry.anchorId)
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
