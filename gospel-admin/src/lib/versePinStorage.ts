/**
 * Up to five color-keyed scripture pins per profile (localStorage only).
 */

export const VERSE_PIN_COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'violet'] as const
export type VersePinColorId = (typeof VERSE_PIN_COLOR_IDS)[number]

export const VERSE_PIN_STORAGE_KEY_PREFIX = 'gospel-verse-pins-'

/** Removed hook `useScriptureProgress` — one-time migrate from this key into verse pins (`yellow`). */
export const LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX = 'gospel-scripture-progress-'

const SCHEMA_VERSION = 1

export interface VersePinSlotEntry {
  reference: string
  sectionId: string
  subsectionId: string
}

/** One row per color (null = slot empty). */
export type VersePinMapState = Record<VersePinColorId, VersePinSlotEntry | null>

export interface VersePinAnchoredEntry extends VersePinSlotEntry {
  colorId: VersePinColorId
}

interface StoredShape {
  v: number
  byColor: VersePinMapState
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

/** Empty map for SSR / initial React state */
export function createEmptyVersePinMap(): VersePinMapState {
  return emptyByColor()
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

function parseStored(value: string | null): VersePinMapState {
  if (!value) return emptyByColor()
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return emptyByColor()
    const shape = parsed as Partial<StoredShape>
    const byColor = shape.byColor
    if (!byColor || typeof byColor !== 'object') return emptyByColor()
    const out = emptyByColor()
    for (const id of VERSE_PIN_COLOR_IDS) {
      const slot = normalizeSlot((byColor as Record<string, unknown>)[id])
      out[id] = slot
    }
    return out
  } catch {
    return emptyByColor()
  }
}

export function versePinStorageKey(profileSlug: string): string {
  return `${VERSE_PIN_STORAGE_KEY_PREFIX}${profileSlug}`
}

export function legacyScriptureProgressStorageKey(profileSlug: string): string {
  return `${LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX}${profileSlug}`
}

/**
 * Parses legacy `{ reference, sectionId?, subsectionId?, viewedAt? }` from useScriptureProgress.
 * Returns null when missing/invalid — same anchors as verse pins (`modal-view` when empty).
 */
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

/** Missing or modal-view anchors match any display row with that reference; explicit section/subsection match that card. */
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

export function loadVersePins(profileSlug: string): VersePinMapState {
  if (typeof window === 'undefined') return emptyByColor()
  try {
    const map = parseStored(localStorage.getItem(versePinStorageKey(profileSlug)))
    const hasAnyPin = VERSE_PIN_COLOR_IDS.some((id) => map[id] != null)
    const legacyKey = legacyScriptureProgressStorageKey(profileSlug)

    if (hasAnyPin) {
      try {
        localStorage.removeItem(legacyKey)
      } catch {
        /* ignore */
      }
      return map
    }

    const legacySlot = parseLegacyScriptureProgress(localStorage.getItem(legacyKey))
    if (!legacySlot) {
      return map
    }

    map.yellow = { ...legacySlot }
    if (persistVersePinsOrFalse(profileSlug, map)) {
      try {
        localStorage.removeItem(legacyKey)
      } catch {
        /* ignore */
      }
    }
    return map
  } catch {
    return emptyByColor()
  }
}

/** Returns true iff the map was written and read-back matches (avoids orphaning migration source on failed persist). */
function persistVersePinsOrFalse(profileSlug: string, map: VersePinMapState): boolean {
  if (typeof window === 'undefined') return false
  try {
    const key = versePinStorageKey(profileSlug)
    const payload: StoredShape = { v: SCHEMA_VERSION, byColor: map }
    const serialized = JSON.stringify(payload)
    localStorage.setItem(key, serialized)
    return localStorage.getItem(key) === serialized
  } catch {
    return false
  }
}

function savePins(profileSlug: string, map: VersePinMapState): void {
  void persistVersePinsOrFalse(profileSlug, map)
}

export function clearAllVersePins(profileSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(versePinStorageKey(profileSlug))
  } catch {
    /* ignore */
  }
}

/** Flat map → list of non-null pins (UI). */
export function versePinsListFromMap(map: VersePinMapState): VersePinAnchoredEntry[] {
  const list: VersePinAnchoredEntry[] = []
  for (const colorId of VERSE_PIN_COLOR_IDS) {
    const slot = map[colorId]
    if (slot) list.push({ colorId, ...slot })
  }
  return list
}

export function removeVersePinByColor(profileSlug: string, colorId: VersePinColorId): VersePinMapState {
  const map = loadVersePins(profileSlug)
  map[colorId] = null
  const anyLeft = VERSE_PIN_COLOR_IDS.some(id => map[id] != null)
  if (!anyLeft) {
    clearAllVersePins(profileSlug)
    return emptyByColor()
  }
  savePins(profileSlug, map)
  return map
}

/**
 * Assign color slot to verse; clears any other color that pointed at the same display row as `entry`.
 */
export function assignVersePin(
  profileSlug: string,
  colorId: VersePinColorId,
  entry: VersePinSlotEntry
): VersePinMapState {
  const map = loadVersePins(profileSlug)

  for (const id of VERSE_PIN_COLOR_IDS) {
    const slot = map[id]
    if (slot && pinnedVerseMatchesRow(slot, entry)) {
      map[id] = null
    }
  }

  map[colorId] = { ...entry }
  savePins(profileSlug, map)
  return map
}

/**
 * Moves only the yellow slot to this passage (“last verse viewed”).
 * Does not clear other colored pins that share this row — use when closing the modal without changing Pin.
 */
export function assignYellowLastViewed(profileSlug: string, entry: VersePinSlotEntry): VersePinMapState {
  const map = loadVersePins(profileSlug)
  map.yellow = { ...entry }
  savePins(profileSlug, map)
  return map
}

/** Removes every pinned color that resolves to this display row */
export function clearVersePinsMatchingRow(profileSlug: string, entry: VersePinSlotEntry): VersePinMapState {
  const map = loadVersePins(profileSlug)
  let touched = false
  for (const id of VERSE_PIN_COLOR_IDS) {
    const slot = map[id]
    if (slot && pinnedVerseMatchesRow(slot, entry)) {
      map[id] = null
      touched = true
    }
  }
  if (!touched) {
    return map
  }
  const anyLeft = VERSE_PIN_COLOR_IDS.some((cid) => map[cid] != null)
  if (!anyLeft) {
    clearAllVersePins(profileSlug)
    return emptyByColor()
  }
  savePins(profileSlug, map)
  return map
}

/** Colors available in the modal: empty slots, plus any slot pinned to this same passage row. */
export function availablePinColorsForModalChoice(
  map: VersePinMapState,
  currentPassageAnchors: VersePinSlotEntry | null
): VersePinColorId[] {
  const available: VersePinColorId[] = []
  for (const id of VERSE_PIN_COLOR_IDS) {
    const slot = map[id]
    if (!slot) {
      available.push(id)
      continue
    }
    if (
      currentPassageAnchors?.reference.trim() &&
      pinnedVerseMatchesRow(slot, currentPassageAnchors)
    ) {
      available.push(id)
    }
  }
  return available
}

/** Resolve which color pins the current modal passage (same row as anchors + reference). */
export function versePinColorForPassage(map: VersePinMapState, anchors: VersePinSlotEntry | null): VersePinColorId | null {
  if (!anchors?.reference.trim()) return null
  for (const id of VERSE_PIN_COLOR_IDS) {
    const slot = map[id]
    if (slot && pinnedVerseMatchesRow(slot, anchors)) {
      return id
    }
  }
  return null
}
