/** Recent profile resources and scriptures for TOC "Last Open" dropdown (device-only). */

import { isBibleTranslation, type BibleTranslation } from '@/lib/bible-translations'
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

/** One-shot: scroll this resource tab into view after it is added to the tab bar. */
export const REVEAL_RESOURCE_TAB_SESSION_KEY = 'gospel-profile-reveal-resource-tab:v1'

/** One-shot: scroll this scripture tab into view after it is added to the modal tab bar. */
export const REVEAL_SCRIPTURE_TAB_SESSION_KEY = 'gospel-scripture-reveal-tab:v1'

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
  /** Bible translation when the passage was opened (Scripture modal tabs). */
  translation?: BibleTranslation
  /** Compare column translation for this tab (Scripture modal tabs only). */
  compareTranslation?: BibleTranslation
  openedAt: number
}

type ProfileRecentResourcesV3 = {
  v: 3
  resources: ProfileRecentResourceEntry[]
  scriptures: ProfileRecentScriptureEntry[]
  /** Left-to-right tab bar (stable order; titles match Resources / Last Open). */
  resourceTabs?: ProfileRecentResourceEntry[]
  /** Left-to-right Scripture modal tab bar (stable order; separate from Last Open scriptures). */
  scriptureTabs?: ProfileRecentScriptureEntry[]
}

/** @deprecated Use ProfileRecentResourceEntry */
export type ProfileLastOpenResourceV1 = ProfileRecentResourceEntry & { v?: 1 }

function emitProfileLastOpenChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT))
}

function markRevealResourceTabSlug(slug: string): void {
  if (typeof window === 'undefined') return
  const trimmed = slug.trim()
  if (!trimmed) return
  try {
    window.sessionStorage.setItem(REVEAL_RESOURCE_TAB_SESSION_KEY, trimmed)
  } catch {
    /* quota / private mode */
  }
}

function markRevealScriptureTabKey(tabKey: string): void {
  if (typeof window === 'undefined') return
  const trimmed = tabKey.trim()
  if (!trimmed) return
  try {
    window.sessionStorage.setItem(REVEAL_SCRIPTURE_TAB_SESSION_KEY, trimmed)
  } catch {
    /* quota / private mode */
  }
}

/** Read and clear the resource tab id that should be scrolled into view (if any). */
export function consumeRevealResourceTabSlug(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(REVEAL_RESOURCE_TAB_SESSION_KEY)
    window.sessionStorage.removeItem(REVEAL_RESOURCE_TAB_SESSION_KEY)
    const slug = raw?.trim()
    return slug || null
  } catch {
    return null
  }
}

/** Read and clear the scripture tab id that should be scrolled into view (if any). */
export function consumeRevealScriptureTabKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(REVEAL_SCRIPTURE_TAB_SESSION_KEY)
    window.sessionStorage.removeItem(REVEAL_SCRIPTURE_TAB_SESSION_KEY)
    const key = raw?.trim()
    return key || null
  } catch {
    return null
  }
}

function normalizeResourceEntry(raw: unknown): ProfileRecentResourceEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.slug !== 'string') return null
  const slug = o.slug.trim()
  if (!slug) return null
  const title =
    typeof o.title === 'string' ? stripHtmlTags(o.title).trim() : ''
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
  const translationRaw = typeof o.translation === 'string' ? o.translation.trim().toLowerCase() : ''
  const translation = isBibleTranslation(translationRaw) ? translationRaw : undefined
  const compareRaw =
    typeof o.compareTranslation === 'string' ? o.compareTranslation.trim().toLowerCase() : ''
  const compareTranslation = isBibleTranslation(compareRaw) ? compareRaw : undefined
  return {
    slug,
    profileTitle: profileTitle || slug,
    reference,
    sectionId,
    subsectionId,
    ...(chapterView ? { chapterView } : {}),
    ...(translation ? { translation } : {}),
    ...(compareTranslation ? { compareTranslation } : {}),
    openedAt,
  }
}

/** One row per profile + reference (anchors may change between opens). */
function scriptureDedupeKey(entry: Pick<ProfileRecentScriptureEntry, 'slug' | 'reference'>): string {
  const slug = entry.slug.trim()
  const reference = entry.reference.trim().replace(/–/g, '-')
  return `${slug}|${reference}`
}

/** Stable id for Scripture modal tabs (same key as Last Open dedupe). */
export function scriptureModalTabKey(
  entry: Pick<ProfileRecentScriptureEntry, 'slug' | 'reference'>
): string {
  return scriptureDedupeKey(entry)
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
      const resourceTabs = normalizeResourceTabs(parsed, resources)
      const scriptureTabs = normalizeScriptureTabs(parsed, scriptures)
      return { v: 3, resources, scriptures, resourceTabs, scriptureTabs }
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
      const resourceTabs = normalizeResourceTabs(undefined, resources)
      return { v: 3, resources, scriptures: [], resourceTabs, scriptureTabs: [] }
    }
    if (parsed?.v === 1 && typeof parsed.slug === 'string') {
      const entry = normalizeResourceEntry(parsed)
      const resources = entry ? [entry] : []
      const resourceTabs = normalizeResourceTabs(undefined, resources)
      return { v: 3, resources, scriptures: [], resourceTabs, scriptureTabs: [] }
    }
  } catch {
    /* invalid JSON */
  }
  return empty
}

function deriveResourceTabsFromResources(
  resources: ProfileRecentResourceEntry[]
): ProfileRecentResourceEntry[] {
  return [...resources].reverse().slice(0, PROFILE_RECENT_MENU_MAX)
}

function resourceTabsFromLegacySlugs(
  raw: unknown,
  resources: ProfileRecentResourceEntry[]
): ProfileRecentResourceEntry[] {
  if (!Array.isArray(raw)) return []
  const bySlug = new Map(resources.map((r) => [r.slug, r]))
  const out: ProfileRecentResourceEntry[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const slug = item.trim()
    if (!slug || out.some((t) => t.slug === slug)) continue
    out.push(bySlug.get(slug) ?? { slug, title: slug })
    if (out.length >= PROFILE_RECENT_MENU_MAX) break
  }
  return out
}

function mergeTabTitlesFromResources(
  tabs: ProfileRecentResourceEntry[],
  resources: ProfileRecentResourceEntry[]
): ProfileRecentResourceEntry[] {
  const bySlug = new Map(resources.map((r) => [r.slug, r]))
  return tabs.map((tab) => {
    const fromResources = bySlug.get(tab.slug)
    return fromResources
      ? { slug: tab.slug, title: fromResources.title || tab.title }
      : tab
  })
}

function normalizeResourceTabs(
  raw: unknown,
  resources: ProfileRecentResourceEntry[]
): ProfileRecentResourceEntry[] {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const out: ProfileRecentResourceEntry[] = []

  const pushEntry = (entry: ProfileRecentResourceEntry | null) => {
    if (!entry || out.some((t) => t.slug === entry.slug)) return
    out.push(entry)
  }

  if (parsed && Array.isArray(parsed.resourceTabs)) {
    for (const item of parsed.resourceTabs) {
      pushEntry(normalizeResourceEntry(item))
      if (out.length >= PROFILE_RECENT_MENU_MAX) break
    }
  }

  if (out.length === 0 && parsed && Array.isArray(parsed.resourceTabSlugs)) {
    for (const entry of resourceTabsFromLegacySlugs(parsed.resourceTabSlugs, resources)) {
      pushEntry(entry)
      if (out.length >= PROFILE_RECENT_MENU_MAX) break
    }
  }

  if (out.length === 0) return deriveResourceTabsFromResources(resources)
  return mergeTabTitlesFromResources(out, resources).slice(0, PROFILE_RECENT_MENU_MAX)
}

function touchResourceTab(
  tabs: ProfileRecentResourceEntry[],
  entry: ProfileRecentResourceEntry
): ProfileRecentResourceEntry[] {
  const idx = tabs.findIndex((t) => t.slug === entry.slug)
  if (idx >= 0) {
    const next = [...tabs]
    next[idx] = entry
    return next
  }
  markRevealResourceTabSlug(entry.slug)
  const next = [...tabs, entry]
  if (next.length <= PROFILE_RECENT_MENU_MAX) return next
  return next.slice(-PROFILE_RECENT_MENU_MAX)
}

function deriveScriptureTabsFromScriptures(
  scriptures: ProfileRecentScriptureEntry[]
): ProfileRecentScriptureEntry[] {
  return [...scriptures].reverse().slice(0, PROFILE_RECENT_MENU_MAX)
}

function mergeScriptureTabFieldsFromMru(
  tabs: ProfileRecentScriptureEntry[],
  scriptures: ProfileRecentScriptureEntry[]
): ProfileRecentScriptureEntry[] {
  const byKey = new Map(scriptures.map((s) => [scriptureDedupeKey(s), s]))
  return tabs.map((tab) => {
    const fromMru = byKey.get(scriptureDedupeKey(tab))
    if (!fromMru) return tab
    return {
      ...tab,
      profileTitle: fromMru.profileTitle || tab.profileTitle,
      sectionId: fromMru.sectionId || tab.sectionId,
      subsectionId: fromMru.subsectionId || tab.subsectionId,
      translation: tab.translation,
      chapterView: tab.chapterView,
      compareTranslation: tab.compareTranslation,
    }
  })
}

function normalizeScriptureTabs(
  raw: unknown,
  scriptures: ProfileRecentScriptureEntry[]
): ProfileRecentScriptureEntry[] {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const out: ProfileRecentScriptureEntry[] = []

  const pushEntry = (entry: ProfileRecentScriptureEntry | null) => {
    if (!entry || out.some((t) => scriptureDedupeKey(t) === scriptureDedupeKey(entry))) return
    out.push(entry)
  }

  if (parsed && Array.isArray(parsed.scriptureTabs)) {
    for (const item of parsed.scriptureTabs) {
      pushEntry(normalizeScriptureEntry(item))
      if (out.length >= PROFILE_RECENT_MENU_MAX) break
    }
  }

  if (out.length === 0) return deriveScriptureTabsFromScriptures(scriptures)
  return mergeScriptureTabFieldsFromMru(out, scriptures).slice(0, PROFILE_RECENT_MENU_MAX)
}

function normalizeScriptureTabsOnSave(
  tabs: ProfileRecentScriptureEntry[],
  scriptures: ProfileRecentScriptureEntry[]
): ProfileRecentScriptureEntry[] {
  if (tabs.length === 0) return []
  return mergeScriptureTabFieldsFromMru(tabs, scriptures).slice(0, PROFILE_RECENT_MENU_MAX)
}

/** Merge tab row fields; omit optional keys on entry to leave stored values unchanged. */
function mergeScriptureTabEntryFields(
  prev: ProfileRecentScriptureEntry | undefined,
  entry: ProfileRecentScriptureEntry
): ProfileRecentScriptureEntry {
  const chapterView = 'chapterView' in entry ? entry.chapterView : prev?.chapterView
  const compareTranslation = 'compareTranslation' in entry
    ? entry.compareTranslation
    : prev?.compareTranslation
  return {
    ...prev,
    ...entry,
    openedAt: prev?.openedAt ?? entry.openedAt,
    translation: entry.translation ?? prev?.translation,
    chapterView,
    compareTranslation,
  }
}

function touchScriptureTab(
  tabs: ProfileRecentScriptureEntry[],
  entry: ProfileRecentScriptureEntry
): ProfileRecentScriptureEntry[] {
  const key = scriptureDedupeKey(entry)
  const idx = tabs.findIndex((t) => scriptureDedupeKey(t) === key)
  if (idx >= 0) {
    const next = [...tabs]
    next[idx] = mergeScriptureTabEntryFields(next[idx], entry)
    return next
  }
  markRevealScriptureTabKey(scriptureModalTabKey(entry))
  const next = [...tabs, entry]
  if (next.length <= PROFILE_RECENT_MENU_MAX) return next
  return next.slice(-PROFILE_RECENT_MENU_MAX)
}

function saveStoredPayload(
  resources: ProfileRecentResourceEntry[],
  scriptures: ProfileRecentScriptureEntry[],
  resourceTabs: ProfileRecentResourceEntry[],
  scriptureTabs: ProfileRecentScriptureEntry[]
): void {
  if (typeof window === 'undefined') return
  try {
    const trimmedResources = resources.slice(0, PROFILE_RECENT_RESOURCES_STORED_MAX)
    const trimmedScriptures = scriptures.slice(0, PROFILE_RECENT_SCRIPTURES_STORED_MAX)
    const payload: ProfileRecentResourcesV3 = {
      v: 3,
      resources: trimmedResources,
      scriptures: trimmedScriptures,
      resourceTabs: normalizeResourceTabs({ resourceTabs }, trimmedResources),
      scriptureTabs: normalizeScriptureTabsOnSave(scriptureTabs, trimmedScriptures),
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
  const { scriptures, scriptureTabs } = loadStoredPayload()
  const withoutCurrent = loadProfileRecentResources().filter((r) => r.slug !== slug)
  const nextResources = [{ slug, title }, ...withoutCurrent].slice(0, PROFILE_RECENT_RESOURCES_STORED_MAX)
  const { resourceTabs: existingTabs } = loadStoredPayload()
  const tabBase =
    existingTabs && existingTabs.length > 0
      ? existingTabs
      : deriveResourceTabsFromResources(nextResources)
  const nextTabs = touchResourceTab(tabBase, { slug, title })
  saveStoredPayload(nextResources, scriptures, nextTabs, scriptureTabs ?? [])
}

export type RecordScriptureLastOpenInput = {
  slug: string
  profileTitle: string
  reference: string
  sectionId: string
  subsectionId: string
  /** Verse pane when false/omitted; chapter pane when true (modal tab persistence). */
  chapterView?: boolean
  /** Bible translation when the passage was opened (modal tabs and Last Open). */
  translation?: BibleTranslation
  /** Compare column for modal tabs; null/omit when compare is off. */
  compareTranslation?: BibleTranslation | null
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
    ...(input.translation ? { translation: input.translation } : {}),
    openedAt: Date.now(),
  }

  const { resources, scriptureTabs } = loadStoredPayload()
  const key = scriptureDedupeKey(entry)
  const withoutDup = loadProfileRecentScriptures().filter((s) => scriptureDedupeKey(s) !== key)
  const nextScriptures = [entry, ...withoutDup].slice(0, PROFILE_RECENT_SCRIPTURES_STORED_MAX)
  const tabs = loadStoredPayload().resourceTabs ?? deriveResourceTabsFromResources(resources)
  saveStoredPayload(resources, nextScriptures, tabs, scriptureTabs ?? [])
}

function compareTranslationForTabEntry(
  input: RecordScriptureLastOpenInput
): BibleTranslation | undefined {
  const primary = input.translation
  const compare = input.compareTranslation
  if (!compare || !isBibleTranslation(compare)) return undefined
  if (primary && compare === primary) return undefined
  return compare
}

function buildScriptureModalTabEntry(input: RecordScriptureLastOpenInput): ProfileRecentScriptureEntry | null {
  const slug = input.slug.trim()
  const reference = input.reference.trim().replace(/–/g, '-')
  const sectionId = input.sectionId.trim() || 'modal-view'
  const subsectionId = input.subsectionId.trim() || 'modal-view'
  if (!slug || !reference) return null

  const profileTitle = stripHtmlTags(input.profileTitle ?? '').trim() || slug
  const base: ProfileRecentScriptureEntry = {
    slug,
    profileTitle,
    reference,
    sectionId,
    subsectionId,
    ...(input.translation ? { translation: input.translation } : {}),
    openedAt: Date.now(),
  }
  let entry: ProfileRecentScriptureEntry = base
  if (input.chapterView !== undefined) {
    entry =
      input.chapterView === true
        ? { ...entry, chapterView: true }
        : { ...entry, chapterView: undefined }
  }
  if (input.compareTranslation === undefined) {
    return entry
  }
  const compareTranslation = compareTranslationForTabEntry(input)
  if (compareTranslation) {
    return { ...entry, compareTranslation }
  }
  return { ...entry, compareTranslation: undefined }
}

/** Add or refresh a passage in the Scripture modal tab bar (does not change Last Open scriptures). */
export function recordScriptureModalTab(input: RecordScriptureLastOpenInput): void {
  if (typeof window === 'undefined') return

  const entry = buildScriptureModalTabEntry(input)
  if (!entry) return

  const { resources, scriptures, resourceTabs, scriptureTabs: existingTabs } = loadStoredPayload()
  const tabBase = existingTabs && existingTabs.length > 0 ? existingTabs : []
  const nextScriptureTabs = touchScriptureTab(tabBase, entry)
  saveStoredPayload(resources, scriptures, resourceTabs ?? [], nextScriptureTabs)
}

function ensureScriptureTabsIncludeCurrent(
  tabs: ProfileRecentScriptureEntry[],
  current?: RecordScriptureLastOpenInput
): ProfileRecentScriptureEntry[] {
  const entry = current ? buildScriptureModalTabEntry(current) : null
  if (!entry) return tabs
  const key = scriptureDedupeKey(entry)
  const idx = tabs.findIndex((t) => scriptureDedupeKey(t) === key)
  if (idx >= 0) {
    const next = [...tabs]
    next[idx] = mergeScriptureTabEntryFields(next[idx], entry)
    return next
  }
  markRevealScriptureTabKey(key)
  const next = [...tabs, entry]
  if (next.length <= PROFILE_RECENT_MENU_MAX) return next
  return next.slice(-PROFILE_RECENT_MENU_MAX)
}

/** Stored modal tab row for a profile + reference (undefined when not in the tab bar). */
export function getScriptureModalTabEntry(
  slug: string,
  reference: string
): ProfileRecentScriptureEntry | undefined {
  const trimmedSlug = slug.trim()
  const trimmedRef = reference.trim().replace(/–/g, '-')
  if (!trimmedSlug || !trimmedRef) return undefined
  const key = scriptureDedupeKey({ slug: trimmedSlug, reference: trimmedRef })
  const { scriptureTabs } = loadStoredPayload()
  if (!scriptureTabs?.length) return undefined
  return scriptureTabs.find((t) => scriptureDedupeKey(t) === key)
}

/**
 * Tab to activate when reopening Scripture modal (e.g. Bible Reader when passages are already open).
 * Prefers the rightmost tab on the current profile; otherwise the rightmost tab overall.
 */
export function resolveScriptureModalTabToRestore(
  profileSlug: string
): ProfileRecentScriptureEntry | null {
  const tabs = loadScriptureModalTabs()
  if (tabs.length === 0) return null
  const slug = profileSlug.trim()
  if (!slug) return tabs[tabs.length - 1]!
  const profileTabs = tabs.filter((t) => t.slug.trim() === slug)
  if (profileTabs.length > 0) return profileTabs[profileTabs.length - 1]!
  return tabs[tabs.length - 1]!
}

/** Entries for the Scripture modal tab bar (stable left-to-right order; up to {@link PROFILE_RECENT_MENU_MAX}). */
export function loadScriptureModalTabs(
  current?: RecordScriptureLastOpenInput
): ProfileRecentScriptureEntry[] {
  const { scriptures, scriptureTabs } = loadStoredPayload()
  const baseTabs =
    scriptureTabs && scriptureTabs.length > 0
      ? scriptureTabs
      : deriveScriptureTabsFromScriptures(scriptures)
  return ensureScriptureTabsIncludeCurrent(
    mergeScriptureTabFieldsFromMru(baseTabs, scriptures),
    current
  )
}

/** Tab to open after closing the active Scripture modal tab. Call before {@link removeScriptureModalTab}. */
export function resolveScriptureTabNavigationAfterClose(
  closedSlug: string,
  closedReference: string
): ProfileRecentScriptureEntry | null {
  const slug = closedSlug.trim()
  const reference = closedReference.trim().replace(/–/g, '-')
  if (!slug || !reference) return null
  const key = scriptureDedupeKey({ slug, reference })
  const tabs = loadScriptureModalTabs()
  const idx = tabs.findIndex((t) => scriptureDedupeKey(t) === key)
  if (idx < 0) return tabs[0] ?? null
  return tabs[idx + 1] ?? tabs[idx - 1] ?? null
}

/** Remove a passage from the Scripture modal tab bar only; Last Open scriptures are unchanged. */
export function removeScriptureModalTab(closedSlug: string, closedReference: string): void {
  if (typeof window === 'undefined') return

  const slug = closedSlug.trim()
  const reference = closedReference.trim().replace(/–/g, '-')
  if (!slug || !reference) return

  const key = scriptureDedupeKey({ slug, reference })
  const { resources, scriptures, resourceTabs } = loadStoredPayload()
  const nextScriptureTabs = (loadStoredPayload().scriptureTabs ?? []).filter(
    (t) => scriptureDedupeKey(t) !== key
  )
  saveStoredPayload(resources, scriptures, resourceTabs ?? [], nextScriptureTabs)
}

function ensureResourceTabsIncludeCurrent(
  tabs: ProfileRecentResourceEntry[],
  currentProfileSlug: string | undefined,
  currentProfileTitle: string | undefined
): ProfileRecentResourceEntry[] {
  const current = currentProfileSlug?.trim()
  if (!current) return tabs
  const title = stripHtmlTags(currentProfileTitle ?? '').trim() || current
  const idx = tabs.findIndex((t) => t.slug === current)
  if (idx >= 0) {
    if (tabs[idx]?.title === title) return tabs
    const next = [...tabs]
    next[idx] = { slug: current, title }
    return next
  }
  markRevealResourceTabSlug(current)
  const next = [...tabs, { slug: current, title }]
  if (next.length <= PROFILE_RECENT_MENU_MAX) return next
  return next.slice(-PROFILE_RECENT_MENU_MAX)
}

/** Entries for the profile tab bar (stable left-to-right order; up to {@link PROFILE_RECENT_MENU_MAX}). */
export function loadProfileRecentResourcesForTabs(
  currentProfileSlug?: string,
  currentProfileTitle?: string
): ProfileRecentResourceEntry[] {
  const { resources, resourceTabs } = loadStoredPayload()
  const baseTabs =
    resourceTabs && resourceTabs.length > 0
      ? resourceTabs
      : deriveResourceTabsFromResources(resources)
  return ensureResourceTabsIncludeCurrent(
    mergeTabTitlesFromResources(baseTabs, resources),
    currentProfileSlug,
    currentProfileTitle
  )
}

/** Tab to open after closing `closedSlug` (prefer right, then left). Call before {@link removeProfileResourceTab}. */
export function resolveProfileTabNavigationAfterClose(closedSlug: string): string | null {
  const slug = closedSlug.trim()
  if (!slug) return null
  const tabs = loadProfileRecentResourcesForTabs()
  const idx = tabs.findIndex((t) => t.slug === slug)
  if (idx < 0) return loadProfileRecentResources()[0]?.slug ?? null
  return tabs[idx + 1]?.slug ?? tabs[idx - 1]?.slug ?? null
}

/** Remove a profile from the open tab bar only; Last Open MRU `resources` and scriptures are unchanged. */
export function removeProfileResourceTab(profileSlug: string): void {
  if (typeof window === 'undefined') return

  const slug = profileSlug.trim()
  if (!slug) return

  const { resources, scriptures, scriptureTabs } = loadStoredPayload()
  const nextTabs = (loadStoredPayload().resourceTabs ?? []).filter((t) => t.slug !== slug)
  saveStoredPayload(resources, scriptures, nextTabs, scriptureTabs ?? [])
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
  if (entry.translation) {
    params.set('translation', entry.translation)
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
