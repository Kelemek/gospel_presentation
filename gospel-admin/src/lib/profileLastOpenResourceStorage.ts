/** Recent profile resources for TOC "Last Open" dropdown (device-only). */

import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { stripHtmlTags } from '@/lib/stripHtmlTags'

export const PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY = 'gospel-profile-last-open-resource:v1'

/** Rows shown in the Last Open dropdown (current profile excluded). */
export const PROFILE_RECENT_MENU_MAX = 5

/** Stored history length (includes current profile for touch-recency). */
export const PROFILE_RECENT_RESOURCES_STORED_MAX = PROFILE_RECENT_MENU_MAX + 1

/** @deprecated Use PROFILE_RECENT_MENU_MAX or PROFILE_RECENT_RESOURCES_STORED_MAX */
export const PROFILE_RECENT_RESOURCES_MAX = PROFILE_RECENT_MENU_MAX

export const GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT = 'gospel-profile-last-open-changed' as const

export type ProfileRecentResourceEntry = {
  slug: string
  title: string
}

type ProfileRecentResourcesV2 = {
  v: 2
  resources: ProfileRecentResourceEntry[]
}

/** @deprecated Use ProfileRecentResourceEntry */
export type ProfileLastOpenResourceV1 = ProfileRecentResourceEntry & { v?: 1 }

function emitProfileLastOpenChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT))
}

function normalizeEntry(raw: unknown): ProfileRecentResourceEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.slug !== 'string') return null
  const slug = o.slug.trim()
  if (!slug) return null
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  return { slug, title: title || slug }
}

function parseStoredResources(raw: string | null): ProfileRecentResourceEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed?.v === 2 && Array.isArray(parsed.resources)) {
      const out: ProfileRecentResourceEntry[] = []
      for (const item of parsed.resources) {
        const entry = normalizeEntry(item)
        if (!entry) continue
        if (out.some((r) => r.slug === entry.slug)) continue
        out.push(entry)
        if (out.length >= PROFILE_RECENT_RESOURCES_STORED_MAX) break
      }
      return out
    }
    if (parsed?.v === 1 && typeof parsed.slug === 'string') {
      const entry = normalizeEntry(parsed)
      return entry ? [entry] : []
    }
  } catch {
    /* invalid JSON */
  }
  return []
}

function saveProfileRecentResources(resources: ProfileRecentResourceEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: ProfileRecentResourcesV2 = { v: 2, resources }
    gospelStorageSetSync(PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY, JSON.stringify(payload))
    emitProfileLastOpenChanged()
  } catch {
    /* quota / private mode */
  }
}

export function loadProfileRecentResources(): ProfileRecentResourceEntry[] {
  if (typeof window === 'undefined') return []
  return parseStoredResources(gospelStorageGetSync(PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY))
}

/**
 * Call when a profile page mounts or slug/title changes. Updates touch-recency (most recent first).
 */
export function recordProfileLastOpenOnEnter(profileSlug: string, profileTitle: string): void {
  if (typeof window === 'undefined') return

  const slug = profileSlug.trim()
  if (!slug) return

  const title = stripHtmlTags(profileTitle ?? '').trim() || slug
  const withoutCurrent = loadProfileRecentResources().filter((r) => r.slug !== slug)
  const next = [{ slug, title }, ...withoutCurrent].slice(0, PROFILE_RECENT_RESOURCES_STORED_MAX)
  saveProfileRecentResources(next)
}

/** Entries for the menu, excluding the profile currently open (up to {@link PROFILE_RECENT_MENU_MAX}). */
export function loadProfileRecentResourcesForMenu(
  currentProfileSlug: string | undefined
): ProfileRecentResourceEntry[] {
  const list = loadProfileRecentResources()
  const current = currentProfileSlug?.trim() ?? ''
  const filtered = current ? list.filter((r) => r.slug !== current) : list
  return filtered.slice(0, PROFILE_RECENT_MENU_MAX)
}

/** @deprecated Use loadProfileRecentResources or loadProfileRecentResourcesForMenu */
export function loadProfileLastOpenResource(): ProfileRecentResourceEntry | null {
  return loadProfileRecentResources()[0] ?? null
}

/** Test-only: no-op (touch-recency model has no navigation refs). */
export function resetProfileLastOpenNavigationRefsForTests(): void {
  /* retained for test setup compatibility */
}
