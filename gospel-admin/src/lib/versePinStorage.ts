/**
 * Scripture pins per profile: one yellow (“last verse viewed”) + unlimited
 * tinted bookmarks (red/blue/green/violet repeats allowed across passages).
 */

import {
  gospelStorageGet,
  gospelStorageGetSync,
  gospelStorageRemoveSync,
  gospelStorageSet,
} from '@/lib/gospelClientStorage'

export const VERSE_PIN_COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'violet'] as const
export type VersePinColorId = (typeof VERSE_PIN_COLOR_IDS)[number]

/** Colors stored as repeatable bookmarks (not the yellow slot). */
export const VERSE_BOOKMARK_COLOR_IDS = ['red', 'blue', 'green', 'violet'] as const
export type VerseBookmarkColorId = (typeof VERSE_BOOKMARK_COLOR_IDS)[number]

export const VERSE_PIN_STORAGE_KEY_PREFIX = 'gospel-verse-pins-'

/** Removed hook `useScriptureProgress` — one-time migrate from this key into verse pins (`yellow`). */
export const LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX = 'gospel-scripture-progress-'

const STORAGE_VERSION = 2

export interface VersePinSlotEntry {
  reference: string
  sectionId: string
  subsectionId: string
}

export interface VersePinBookmarkStored extends VersePinSlotEntry {
  id: string
  colorId: VerseBookmarkColorId
}

export interface VersePinsStoredState {
  yellow: VersePinSlotEntry | null
  bookmarks: VersePinBookmarkStored[]
}

/** @deprecated v1-only shape kept for migrating old localStorage payloads */
export type VersePinMapState = Record<VersePinColorId, VersePinSlotEntry | null>

export interface VersePinAnchoredEntry extends VersePinSlotEntry {
  colorId: VersePinColorId
  /** Set for red/blue/green/violet bookmarks; omit for yellow (“last verse viewed”). */
  bookmarkId?: string
}

export type VersePinRemovalTarget =
  | { kind: 'yellow' }
  | { kind: 'bookmark'; bookmarkId: string }

interface StoredShapeV1 {
  v: 1
  byColor: VersePinMapState
}

interface StoredShapeV2 {
  v: 2
  yellow: VersePinSlotEntry | null
  bookmarks: VersePinBookmarkStored[]
}

function emptyState(): VersePinsStoredState {
  return { yellow: null, bookmarks: [] }
}

export function createEmptyVersePinsState(): VersePinsStoredState {
  return emptyState()
}

/** @deprecated use createEmptyVersePinsState */
export function createEmptyVersePinMap(): VersePinMapState {
  return {
    red: null,
    blue: null,
    yellow: null,
    green: null,
    violet: null,
  }
}

export function newVerseBookmarkId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `vk-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function normalizeSlot(raw: unknown): VersePinSlotEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const reference = typeof o.reference === 'string' ? o.reference.trim() : ''
  const sectionId = typeof o.sectionId === 'string' ? o.sectionId : ''
  const subsectionId = typeof o.subsectionId === 'string' ? o.subsectionId : ''
  if (!reference) return null
  return { reference, sectionId, subsectionId }
}

function normalizeBookmarkStored(raw: unknown): VersePinBookmarkStored | null {
  const slot = normalizeSlot(raw)
  if (!slot) return null
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : ''
  const colorId = o.colorId
  const isBookmarkColor =
    colorId === 'red' ||
    colorId === 'blue' ||
    colorId === 'green' ||
    colorId === 'violet'
  if (!id || !isBookmarkColor) return null
  return { id, colorId: colorId as VerseBookmarkColorId, ...slot }
}

/** True when a non-yellow bookmark pins the same display row as `entry`. */
export function hasNonYellowBookmarkForRow(
  state: VersePinsStoredState,
  entry: Pick<VersePinSlotEntry, 'reference' | 'sectionId' | 'subsectionId'>
): boolean {
  return state.bookmarks.some((b) => pinnedVerseMatchesRow(b, entry))
}

/**
 * When persisting yellow (“last verse viewed”) for a passage, advance only if
 * nothing else bookmarks this passage.
 */
export function shouldAdvanceYellowLastViewed(
  state: VersePinsStoredState,
  entry: Pick<VersePinSlotEntry, 'reference' | 'sectionId' | 'subsectionId'>
): boolean {
  return !hasNonYellowBookmarkForRow(state, entry)
}

function migrateV1ByColorToState(byColor: Partial<VersePinMapState> | null | undefined): VersePinsStoredState {
  const map = emptyByColor()
  if (byColor && typeof byColor === 'object') {
    for (const id of VERSE_PIN_COLOR_IDS) {
      map[id] = normalizeSlot((byColor as Record<string, unknown>)[id])
    }
  }
  const bookmarks: VersePinBookmarkStored[] = []
  for (const colorId of VERSE_BOOKMARK_COLOR_IDS) {
    const slot = map[colorId]
    if (slot) {
      bookmarks.push({ id: newVerseBookmarkId(), colorId, ...slot })
    }
  }
  return { yellow: map.yellow, bookmarks }
}

function emptyByColor(): VersePinMapState {
  return {
    red: null,
    blue: null,
    yellow: null,
    green: null,
    violet: null,
  }
}

function parseStoredJSON(value: string | null): { state: VersePinsStoredState; needsV2Persist: boolean } {
  if (!value) return { state: emptyState(), needsV2Persist: false }
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return { state: emptyState(), needsV2Persist: false }
    const o = parsed as Record<string, unknown>
    const v = o.v

    if (v === 2) {
      const yellowRaw = o.yellow
      const yellow = yellowRaw == null ? null : normalizeSlot(yellowRaw)
      const bookmarksRaw = o.bookmarks
      const bookmarks: VersePinBookmarkStored[] = []
      if (Array.isArray(bookmarksRaw)) {
        for (const item of bookmarksRaw) {
          const b = normalizeBookmarkStored(item)
          if (b) bookmarks.push(b)
        }
      }
      return { state: { yellow, bookmarks }, needsV2Persist: false }
    }

    const byColor = (o as Partial<StoredShapeV1>).byColor
    if (byColor && typeof byColor === 'object') {
      return { state: migrateV1ByColorToState(byColor as Partial<VersePinMapState>), needsV2Persist: true }
    }

    return { state: emptyState(), needsV2Persist: false }
  } catch {
    return { state: emptyState(), needsV2Persist: false }
  }
}

export function versePinStorageKey(profileSlug: string): string {
  return `${VERSE_PIN_STORAGE_KEY_PREFIX}${profileSlug}`
}

export function legacyScriptureProgressStorageKey(profileSlug: string): string {
  return `${LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX}${profileSlug}`
}

export function parseLegacyScriptureProgress(value: string | null): VersePinSlotEntry | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const reference = typeof o.reference === 'string' ? o.reference.trim() : ''
    if (!reference) return null
    const sectionId =
      typeof o.sectionId === 'string' && o.sectionId.trim() !== '' ? o.sectionId.trim() : 'modal-view'
    const subsectionId =
      typeof o.subsectionId === 'string' && o.subsectionId.trim() !== '' ? o.subsectionId.trim() : 'modal-view'
    return { reference, sectionId, subsectionId }
  } catch {
    return null
  }
}

export function anchoredPinMatchesDisplayRow(
  pin: Pick<VersePinSlotEntry, 'reference' | 'sectionId' | 'subsectionId'>,
  rowReference: string,
  anchorSectionId: string,
  anchorSubsectionId: string
): boolean {
  if (pin.reference !== rowReference) return false
  const isModalPlaceholder =
    pin.sectionId === 'modal-view' && pin.subsectionId === 'modal-view'
  const missingAnchors = !pin.sectionId?.trim() || !pin.subsectionId?.trim()
  if (missingAnchors || isModalPlaceholder) {
    return true
  }
  return pin.sectionId === anchorSectionId && pin.subsectionId === anchorSubsectionId
}

export function pinnedVerseMatchesRow(
  entry: Pick<VersePinSlotEntry, 'reference' | 'sectionId' | 'subsectionId'>,
  candidate: Pick<VersePinSlotEntry, 'reference' | 'sectionId' | 'subsectionId'>
): boolean {
  return anchoredPinMatchesDisplayRow(entry, candidate.reference, candidate.sectionId, candidate.subsectionId)
}

function hasAnyStoredPin(state: VersePinsStoredState): boolean {
  return state.yellow != null || state.bookmarks.length > 0
}

/** Removes bookmarks and optionally yellow targeting the same row as `entry`. */
function clearRowConflictsMutable(state: VersePinsStoredState, entry: VersePinSlotEntry): void {
  state.bookmarks = state.bookmarks.filter((b) => !pinnedVerseMatchesRow(b, entry))
  if (state.yellow && pinnedVerseMatchesRow(state.yellow, entry)) {
    state.yellow = null
  }
}

export function loadVersePins(profileSlug: string): VersePinsStoredState {
  if (typeof window === 'undefined') return emptyState()
  try {
    const { state, needsV2Persist } = parseStoredJSON(gospelStorageGetSync(versePinStorageKey(profileSlug)))
    const legacyKey = legacyScriptureProgressStorageKey(profileSlug)

    if (needsV2Persist) {
      void persistVersePinsDurable(profileSlug, state)
    }

    if (hasAnyStoredPin(state)) {
      try {
        gospelStorageRemoveSync(legacyKey)
      } catch {
        /* ignore */
      }
      return state
    }

    const legacySlot = parseLegacyScriptureProgress(gospelStorageGetSync(legacyKey))
    if (legacySlot) {
      state.yellow = { ...legacySlot }
      void persistVersePinsDurable(profileSlug, state).then((ok) => {
        if (!ok) return
        try {
          gospelStorageRemoveSync(legacyKey)
        } catch {
          /* ignore */
        }
      })
    }

    return state
  } catch {
    return emptyState()
  }
}

/**
 * Load verse pins from IndexedDB into the sync read cache (needed after navigation
 * or reload when pins live only in IDB, not localStorage).
 */
export async function hydrateVersePinsFromStorage(profileSlug: string): Promise<VersePinsStoredState> {
  if (typeof window === 'undefined') return emptyState()
  const slug = profileSlug.trim()
  if (!slug) return emptyState()
  await gospelStorageGet(versePinStorageKey(slug))
  await gospelStorageGet(legacyScriptureProgressStorageKey(slug))
  return loadVersePins(slug)
}

/** Returns true only after IndexedDB (or localStorage fallback) accepts the write. */
async function persistVersePinsDurable(
  profileSlug: string,
  state: VersePinsStoredState
): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const key = versePinStorageKey(profileSlug)
    const payload: StoredShapeV2 = {
      v: STORAGE_VERSION,
      yellow: state.yellow,
      bookmarks: state.bookmarks,
    }
    return await gospelStorageSet(key, JSON.stringify(payload))
  } catch {
    return false
  }
}

function savePins(profileSlug: string, state: VersePinsStoredState): void {
  void persistVersePinsDurable(profileSlug, state)
}

export function clearAllVersePins(profileSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageRemoveSync(versePinStorageKey(profileSlug))
  } catch {
    /* ignore */
  }
}

/** Bookmarks first; then yellow if it is not shadowed by a bookmark on the same row. */
export function versePinsListFromState(state: VersePinsStoredState): VersePinAnchoredEntry[] {
  const list: VersePinAnchoredEntry[] = []
  for (const b of state.bookmarks) {
    list.push({
      bookmarkId: b.id,
      colorId: b.colorId,
      reference: b.reference,
      sectionId: b.sectionId,
      subsectionId: b.subsectionId,
    })
  }
  if (state.yellow && !hasNonYellowBookmarkForRow(state, state.yellow)) {
    list.push({
      colorId: 'yellow',
      reference: state.yellow.reference,
      sectionId: state.yellow.sectionId,
      subsectionId: state.yellow.subsectionId,
    })
  }
  return list
}

/** @deprecated use versePinsListFromState */
export function versePinsListFromMap(map: VersePinMapState): VersePinAnchoredEntry[] {
  const state = migrateV1ByColorToState(map)
  return versePinsListFromState(state)
}

/** @deprecated use removeVersePin with VersePinRemovalTarget */
export function removeVersePinByColor(profileSlug: string, colorId: VersePinColorId): VersePinsStoredState {
  if (colorId === 'yellow') {
    return removeVersePin(profileSlug, { kind: 'yellow' })
  }
  const state = loadVersePins(profileSlug)
  const bm = state.bookmarks.find((b) => b.colorId === colorId)
  if (!bm) return state
  return removeVersePin(profileSlug, { kind: 'bookmark', bookmarkId: bm.id })
}

export function removeVersePin(profileSlug: string, target: VersePinRemovalTarget): VersePinsStoredState {
  const state = loadVersePins(profileSlug)

  if (target.kind === 'yellow') {
    state.yellow = null
  } else {
    state.bookmarks = state.bookmarks.filter((b) => b.id !== target.bookmarkId)
  }

  if (!hasAnyStoredPin(state)) {
    clearAllVersePins(profileSlug)
    return emptyState()
  }
  savePins(profileSlug, state)
  return state
}

export function assignVersePin(
  profileSlug: string,
  colorId: VersePinColorId,
  entry: VersePinSlotEntry
): VersePinsStoredState {
  if (colorId === 'yellow') {
    return assignYellowLastViewed(profileSlug, entry)
  }

  const state = loadVersePins(profileSlug)
  clearRowConflictsMutable(state, entry)

  state.bookmarks.push({
    id: newVerseBookmarkId(),
    colorId,
    reference: entry.reference,
    sectionId: entry.sectionId,
    subsectionId: entry.subsectionId,
  })
  savePins(profileSlug, state)
  return state
}

export function assignYellowLastViewed(profileSlug: string, entry: VersePinSlotEntry): VersePinsStoredState {
  const state = loadVersePins(profileSlug)
  if (!shouldAdvanceYellowLastViewed(state, entry)) {
    return state
  }
  state.yellow = { ...entry }
  savePins(profileSlug, state)
  return state
}

export function clearVersePinsMatchingRow(profileSlug: string, entry: VersePinSlotEntry): VersePinsStoredState {
  const state = loadVersePins(profileSlug)
  let touched = false
  state.bookmarks = state.bookmarks.filter((b) => {
    if (pinnedVerseMatchesRow(b, entry)) {
      touched = true
      return false
    }
    return true
  })
  if (state.yellow && pinnedVerseMatchesRow(state.yellow, entry)) {
    state.yellow = null
    touched = true
  }
  if (!touched) {
    return state
  }
  if (!hasAnyStoredPin(state)) {
    clearAllVersePins(profileSlug)
    return emptyState()
  }
  savePins(profileSlug, state)
  return state
}

/** Modal pin dropdown: bookmark tints only — yellow comes from closing unchanged, not the picker. */
export function availablePinColorsForModalChoice(
  state: VersePinsStoredState,
  currentPassageAnchors: VersePinSlotEntry | null
): VerseBookmarkColorId[] {
  void state
  void currentPassageAnchors
  return [...VERSE_BOOKMARK_COLOR_IDS]
}

/** Prefer non-yellow bookmarks for this passage row; otherwise yellow slot; else none. */
export function versePinColorForPassage(
  state: VersePinsStoredState,
  anchors: VersePinSlotEntry | null
): VersePinColorId | null {
  if (!anchors?.reference.trim()) return null
  const bmHit = state.bookmarks.find((b) => pinnedVerseMatchesRow(b, anchors))
  if (bmHit) return bmHit.colorId as VersePinColorId

  if (state.yellow && pinnedVerseMatchesRow(state.yellow, anchors)) {
    return 'yellow'
  }
  return null
}
