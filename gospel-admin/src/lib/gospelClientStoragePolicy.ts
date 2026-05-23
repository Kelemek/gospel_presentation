import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { PROFILE_HIGHLIGHTS_STORAGE_KEY } from '@/lib/profileHighlightsStorage'
import { VERSE_PIN_STORAGE_KEY_PREFIX, LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX } from '@/lib/versePinStorage'
import {
  PROFILE_READ_ALONG_LAST_SESSION_KEY_PREFIX,
  PROFILE_READ_ALONG_PROGRESS_KEY_PREFIX,
} from '@/lib/profileReadAlongProgressStorage'
import { PRESENTATION_READ_COMPLETE_STORAGE_KEY } from '@/lib/presentationReadCompleteStorage'

/** Keep in sync with `verseMemorizationStorage.ts`. */
export const VERSE_MEMORIZATION_STORAGE_KEY = 'gospel-memorization-verses'

/** Keep in sync with `GospelSection.tsx` / `gospelLocalUserDataBackup.ts`. */
export const GOSPEL_ANSWERS_KEY_PREFIX = 'gospel-answers-'

export const PROFILE_OFFLINE_CACHE_KEY_PREFIX = 'gospel-profile-'
export const PROFILE_CACHE_INDEX_KEY = 'gospel-profile-cache-index'

const SMALL_LOCAL_STORAGE_KEYS = new Set([
  'gospel-profile-theme',
  'gospel-profile-text-size',
  'gospel-preferred-translation',
  'gospel-admin:memorize-listen-speed',
  'gospel-admin:profile-read-along-underline-style',
  'gospel-presentation-first-visit-welcome-v1',
])

const ALLOWED_GOSPEL_PROFILE_SUFFIXES = new Set([
  'bookmarks',
  'highlights',
  'theme',
  'text-size',
])

const IDB_KEY_PREFIXES = [
  VERSE_PIN_STORAGE_KEY_PREFIX,
  LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX,
  GOSPEL_ANSWERS_KEY_PREFIX,
  PROFILE_READ_ALONG_PROGRESS_KEY_PREFIX,
  PROFILE_READ_ALONG_LAST_SESSION_KEY_PREFIX,
] as const

const IDB_EXACT_KEYS = new Set<string>([
  VERSE_MEMORIZATION_STORAGE_KEY,
  PROFILE_BOOKMARKS_STORAGE_KEY,
  PROFILE_HIGHLIGHTS_STORAGE_KEY,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
  PROFILE_CACHE_INDEX_KEY,
])

export function isProfileReadAlongPersistenceKey(key: string): boolean {
  return (
    key.startsWith(PROFILE_READ_ALONG_PROGRESS_KEY_PREFIX) ||
    key.startsWith(PROFILE_READ_ALONG_LAST_SESSION_KEY_PREFIX)
  )
}

/** Offline profile JSON blobs (`gospel-profile-{slug}`), not bookmarks/highlights/theme. */
export function isProfileOfflineCacheKey(key: string): boolean {
  if (isProfileReadAlongPersistenceKey(key)) return false
  if (!key.startsWith(PROFILE_OFFLINE_CACHE_KEY_PREFIX)) return false
  const rest = key.slice(PROFILE_OFFLINE_CACHE_KEY_PREFIX.length)
  return !ALLOWED_GOSPEL_PROFILE_SUFFIXES.has(rest)
}

export function profileOfflineCacheKey(slug: string): string {
  return `${PROFILE_OFFLINE_CACHE_KEY_PREFIX}${slug}`
}

export function shouldUseIndexedDb(key: string): boolean {
  if (SMALL_LOCAL_STORAGE_KEYS.has(key)) return false
  if (IDB_EXACT_KEYS.has(key)) return true
  if (isProfileOfflineCacheKey(key)) return true
  return IDB_KEY_PREFIXES.some((p) => key.startsWith(p))
}
