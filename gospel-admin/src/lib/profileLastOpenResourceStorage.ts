/** Recent profile resources and scriptures for TOC "Last Open" dropdown (device-only). */

import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { stripHtmlTags } from '@/lib/stripHtmlTags'

export const PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY = 'gospel-profile-last-open-resource:v1'

/** Rows shown per section in the Last Open dropdown. */
export const PROFILE_RECENT_MENU_MAX = 5

/** Stored profile history (includes current profile for touch-recency / launch resume). */
export const PROFILE_RECENT_RESOURCES_STORED_MAX = PROFILE_RECENT_MENU_MAX + 1

/** Stored scripture history for the Scriptures section. */
export const PROFILE_RECENT_SCRIPTURES_STORED_MAX = PROFILE_RECENT_MENU_MAX

/** @deprecated Use PROFILE_RECENT_MENU_MAX or PROFILE_RECENT_RESOURCES_STORED_MAX */
export const PROFILE_RECENT_RESOURCES_MAX = PROFILE_RECENT_MENU_MAX

export const GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT = 'gospel-profile-last-open-changed' as const

/** Set after the first launch-time route decision so we do not override intentional navigation. */
export const PROFILE_APP_LAUNCH_RESUME_SESSION_KEY = 'gospel-profile-app-launch-resume:v1'

export type ProfileRecentResourceEntry = {
  slug: string
  title: string
}

export type ProfileRecentScriptureEntry = {
  slug: string
  profileTitle: string
  reference: string
  sectionId: string
  subsectionId: string
  chapterView?: boolean
  openedAt: number
}

type ProfileRecentResourcesV3 = {
  v: 3
  resources: ProfileRecentResourceEntry[]
  scriptures: ProfileRecentScriptureEntry[]
}

/** @deprecated Use ProfileRecentResourceEntry */
export type ProfileLastOpenResourceV1 = ProfileRecentResourceEntry & { v?: 1 }

function emitProfileLastOpenChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT))
}

function normalizeResourceEntry(raw: unknown): ProfileRecentResourceEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.slug !== 'string') return null
  const slug = o.slug.trim()
  if (!slug) return null
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  return { slug, title: title || slug }
}

function normalizeScriptureEntry(raw: unknown): ProfileRecentScriptureEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.slug !== 'string' || typeof o.reference !== 'string') return null
  const slug = o.slug.trim()
  const reference = o.reference.trim().replace(/–/g, '-')
  if (!slug || !reference) return null
  const profileTitle =
    typeof o.profileTitle === 'string' ? stripHtmlTags(o.profileTitle).trim() : ''
  const sectionId = typeof o.sectionId === 'string' ? o.sectionId.trim() : ''
  const subsectionId = typeof o.subsectionId === 'string' ? o.subsectionId.trim() : ''
  if (!sectionId || !subsectionId) return null
  const openedAt = typeof o.openedAt === 'number' && Number.isFinite(o.openedAt) ? o.openedAt : 0
  const chapterView = o.chapterView === true ? true : undefined
  return {
    slug,
    profileTitle: profileTitle || slug,
    reference,
    sectionId,
    subsectionId,
    ...(chapterView ? { chapterView } : {}),
    openedAt,
  }
}

/** One row per profile + reference (anchors may change between opens). */
function scriptureDedupeKey(entry: Pick<ProfileRecentScriptureEntry, 'slug' | 'reference'>): string {
  const slug = entry.slug.trim()
  const reference = entry.reference.trim().replace(/–/g, '-')
  return `${slug}|${reference}`
}

function parseStoredPayload(raw: string | null): ProfileRecentResourcesV3 {
  const empty: ProfileRecentResourcesV3 = { v: 3, resources: [], scriptures: [] }
  if (!raw) return empty
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed?.v === 3) {
      const resources: ProfileRecentResourceEntry[] = []
      if (Array.isArray(parsed.resources)) {
        for (const item of parsed.resources) {
          const entry = normalizeResourceEntry(item)
          if (!entry) continue
          if (resources.some((r) => r.slug === entry.slug)) continue
          resources.push(entry)
          if (resources.length >= PROFILE_RECENT_RESOURCES_STORED_MAX) break
        }
      }
      const scriptures: ProfileRecentScriptureEntry[] = []
      if (Array.isArray(parsed.scriptures)) {
        for (const item of parsed.scriptures) {
          const entry = normalizeScriptureEntry(item)
          if (!entry) continue
          if (scriptures.some((s) => scriptureDedupeKey(s) === scriptureDedupeKey(entry))) continue
          scriptures.push(entry)
          if (scriptures.length >= PROFILE_RECENT_SCRIPTURES_STORED_MAX) break
        }
      }
      return { v: 3, resources, scriptures }
    }
    if (parsed?.v === 2 && Array.isArray(parsed.resources)) {
      const resources: ProfileRecentResourceEntry[] = []
      for (const item of parsed.resources) {
        const entry = normalizeResourceEntry(item)
        if (!entry) continue
        if (resources.some((r) => r.slug === entry.slug)) continue
        resources.push(entry)
        if (resources.length >= PROFILE_RECENT_RESOURCES_STORED_MAX) break
      }
      return { v: 3, resources, scriptures: [] }
    }
    if (parsed?.v === 1 && typeof parsed.slug === 'string') {
      const entry = normalizeResourceEntry(parsed)
      return { v: 3, resources: entry ? [entry] : [], scriptures: [] }
    }
  } catch {
    /* invalid JSON */
  }
  return empty
}

function saveStoredPayload(resources: ProfileRecentResourceEntry[], scriptures: ProfileRecentScriptureEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: ProfileRecentResourcesV3 = {
      v: 3,
      resources: resources.slice(0, PROFILE_RECENT_RESOURCES_STORED_MAX),
      scriptures: scriptures.slice(0, PROFILE_RECENT_SCRIPTURES_STORED_MAX),
    }
    gospelStorageSetSync(PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY, JSON.stringify(payload))
    emitProfileLastOpenChanged()
  } catch {
    /* quota / private mode */
  }
}

function loadStoredPayload(): ProfileRecentResourcesV3 {
  if (typeof window === 'undefined') {
    return { v: 3, resources: [], scriptures: [] }
  }
  return parseStoredPayload(gospelStorageGetSync(PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY))
}

export function loadProfileRecentResources(): ProfileRecentResourceEntry[] {
  return loadStoredPayload().resources
}

export function loadProfileRecentScriptures(): ProfileRecentScriptureEntry[] {
  return loadStoredPayload().scriptures
}

/**
 * Call when a profile page mounts or slug/title changes. Updates touch-recency (most recent first).
 */
export function recordProfileLastOpenOnEnter(profileSlug: string, profileTitle: string): void {
  if (typeof window === 'undefined') return

  const slug = profileSlug.trim()
  if (!slug) return

  const title = stripHtmlTags(profileTitle ?? '').trim() || slug
  const { scriptures } = loadStoredPayload()
  const withoutCurrent = loadProfileRecentResources().filter((r) => r.slug !== slug)
  const nextResources = [{ slug, title }, ...withoutCurrent].slice(0, PROFILE_RECENT_RESOURCES_STORED_MAX)
  saveStoredPayload(nextResources, scriptures)
}

export type RecordScriptureLastOpenInput = {
  slug: string
  profileTitle: string
  reference: string
  sectionId: string
  subsectionId: string
  chapterView?: boolean
}

/** Call when a passage is shown in ScriptureModal (open or in-modal navigation). */
export function recordScriptureLastOpen(input: RecordScriptureLastOpenInput): void {
  if (typeof window === 'undefined') return

  const slug = input.slug.trim()
  const reference = input.reference.trim().replace(/–/g, '-')
  const sectionId = input.sectionId.trim() || 'modal-view'
  const subsectionId = input.subsectionId.trim() || 'modal-view'
  if (!slug || !reference) return

  const profileTitle = stripHtmlTags(input.profileTitle ?? '').trim() || slug
  const entry: ProfileRecentScriptureEntry = {
    slug,
    profileTitle,
    reference,
    sectionId,
    subsectionId,
    ...(input.chapterView ? { chapterView: true } : {}),
    openedAt: Date.now(),
  }

  const { resources } = loadStoredPayload()
  const key = scriptureDedupeKey(entry)
  const withoutDup = loadProfileRecentScriptures().filter((s) => scriptureDedupeKey(s) !== key)
  const nextScriptures = [entry, ...withoutDup].slice(0, PROFILE_RECENT_SCRIPTURES_STORED_MAX)
  saveStoredPayload(resources, nextScriptures)
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

/** Scriptures section for Last Open (up to {@link PROFILE_RECENT_MENU_MAX}). */
export function loadProfileRecentScripturesForMenu(): ProfileRecentScriptureEntry[] {
  return loadProfileRecentScriptures().slice(0, PROFILE_RECENT_MENU_MAX)
}

/** Profile URL with query params to reopen ScriptureModal at the saved passage. */
export function buildProfileRecentScriptureHref(entry: ProfileRecentScriptureEntry): string {
  const params = new URLSearchParams()
  params.set('scriptureRef', entry.reference)
  if (entry.chapterView) {
    params.set('scriptureView', 'chapter')
  }
  return `/${entry.slug}?${params.toString()}`
}

/** Most recently opened profile slug (touch-recency list head), or null. */
export function loadProfileLastActiveSlug(): string | null {
  return loadProfileRecentResources()[0]?.slug ?? null
}

/** Paths that open the generic gospel entry instead of a saved profile. */
export function isProfileAppLaunchEntryPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return normalized === '/' || normalized === '/default'
}

/** Do not auto-route from admin, auth, or static marketing pages. */
export function shouldSkipProfileAppLaunchResume(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized.startsWith('/admin')) return true
  if (normalized.startsWith('/login')) return true
  if (normalized === '/info' || normalized === '/privacy') return true
  return false
}

/** @deprecated Use loadProfileLastActiveSlug or loadProfileRecentResources */
export function loadProfileLastOpenResource(): ProfileRecentResourceEntry | null {
  return loadProfileRecentResources()[0] ?? null
}

/** Test-only: no-op (touch-recency model has no navigation refs). */
export function resetProfileLastOpenNavigationRefsForTests(): void {
  /* retained for test setup compatibility */
}
