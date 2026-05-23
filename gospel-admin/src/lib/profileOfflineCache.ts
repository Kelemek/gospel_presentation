import {
  PROFILE_CACHE_INDEX_KEY,
  profileOfflineCacheKey,
} from '@/lib/gospelClientStoragePolicy'
import {
  gospelStorageGetSync,
  gospelStorageRemove,
  gospelStorageSet,
} from '@/lib/gospelClientStorage'

export const MAX_PROFILE_OFFLINE_CACHE_ENTRIES = 12

interface ProfileCacheIndexEntry {
  slug: string
  touchedAt: number
}

interface ProfileCacheIndexShape {
  v: 1
  entries: ProfileCacheIndexEntry[]
}

function parseIndex(raw: string | null): ProfileCacheIndexEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ProfileCacheIndexShape
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.entries)) return []
    return parsed.entries.filter(
      (e) => e && typeof e.slug === 'string' && typeof e.touchedAt === 'number'
    )
  } catch {
    return []
  }
}

function serializeIndex(entries: ProfileCacheIndexEntry[]): string {
  const payload: ProfileCacheIndexShape = { v: 1, entries }
  return JSON.stringify(payload)
}

function loadIndex(): ProfileCacheIndexEntry[] {
  return parseIndex(gospelStorageGetSync(PROFILE_CACHE_INDEX_KEY))
}

export function getProfileOfflineCache(slug: string): string | null {
  return gospelStorageGetSync(profileOfflineCacheKey(slug))
}

/**
 * Persists an offline profile blob and updates the LRU index (max {@link MAX_PROFILE_OFFLINE_CACHE_ENTRIES} slugs).
 * Evicts older entries before writing so quota is freed first; index is updated only after the profile write succeeds.
 */
export async function setProfileOfflineCache(slug: string, serialized: string): Promise<void> {
  const key = profileOfflineCacheKey(slug)
  const now = Date.now()
  const entries = loadIndex().filter((e) => e.slug !== slug)
  entries.push({ slug, touchedAt: now })
  entries.sort((a, b) => b.touchedAt - a.touchedAt)

  const kept = entries.slice(0, MAX_PROFILE_OFFLINE_CACHE_ENTRIES)
  const overflow = entries.slice(MAX_PROFILE_OFFLINE_CACHE_ENTRIES)

  for (const { slug: evictSlug } of overflow) {
    await gospelStorageRemove(profileOfflineCacheKey(evictSlug))
  }

  const profileSaved = await gospelStorageSet(key, serialized)
  if (!profileSaved) return

  await gospelStorageSet(PROFILE_CACHE_INDEX_KEY, serializeIndex(kept))
}
