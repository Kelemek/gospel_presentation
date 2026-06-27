import { pinnedVerseMatchesRow, type VersePinSlotEntry } from '@/lib/versePinStorage'

/** Kindle read mode only — plain localStorage (not shared with the main app or other devices). */
export const KINDLE_READ_BLUE_PINS_KEY_PREFIX = 'kindle-read-blue-pins-'

export type KindleReadBluePinStored = {
  id: string
  reference: string
  sectionId: string
  subsectionId: string
  /** Kindle read anchor id (e.g. section-1-0-card-0) for reliable pin matching. */
  kindleAnchor?: string
}

export type KindleReadBluePinToggleOptions = {
  kindleAnchor?: string | null
}

export type KindleReadBluePinsV1 = {
  v: 1
  pins: KindleReadBluePinStored[]
}

function newKindleReadBluePinId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `kindle-blue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function kindleReadBluePinsStorageKey(profileSlug: string): string {
  return `${KINDLE_READ_BLUE_PINS_KEY_PREFIX}${profileSlug.trim()}`
}

function normalizePin(raw: unknown): KindleReadBluePinStored | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const reference = typeof o.reference === 'string' ? o.reference.trim() : ''
  const sectionId = typeof o.sectionId === 'string' ? o.sectionId.trim() : ''
  const subsectionId = typeof o.subsectionId === 'string' ? o.subsectionId.trim() : ''
  if (!id || !reference || !sectionId || !subsectionId) return null
  const kindleAnchor =
    typeof o.kindleAnchor === 'string' && o.kindleAnchor.trim()
      ? o.kindleAnchor.trim()
      : undefined
  return { id, reference, sectionId, subsectionId, ...(kindleAnchor ? { kindleAnchor } : {}) }
}

export function kindleReadBluePinMatchesRow(
  pin: KindleReadBluePinStored,
  row: VersePinSlotEntry,
  cardAnchorId?: string | null
): boolean {
  const anchor = cardAnchorId?.trim() || pin.kindleAnchor?.trim()
  if (anchor && pin.kindleAnchor?.trim() === anchor) return true
  return pinnedVerseMatchesRow(pin, row)
}

function normalizeStored(raw: unknown): KindleReadBluePinsV1 {
  if (!raw || typeof raw !== 'object') return { v: 1, pins: [] }
  const o = raw as Record<string, unknown>
  if (o.v !== 1) return { v: 1, pins: [] }
  const pinsRaw = Array.isArray(o.pins) ? o.pins : []
  const pins = pinsRaw
    .map((item) => normalizePin(item))
    .filter((item): item is KindleReadBluePinStored => item !== null)
  return { v: 1, pins }
}

function saveKindleReadBluePins(profileSlug: string, state: KindleReadBluePinsV1): boolean {
  if (typeof window === 'undefined') return false
  const slug = profileSlug.trim()
  if (!slug) return false
  try {
    window.localStorage.setItem(kindleReadBluePinsStorageKey(slug), JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadKindleReadBluePins(profileSlug: string): KindleReadBluePinsV1 {
  if (typeof window === 'undefined') return { v: 1, pins: [] }
  const slug = profileSlug.trim()
  if (!slug) return { v: 1, pins: [] }
  try {
    const raw = window.localStorage.getItem(kindleReadBluePinsStorageKey(slug))
    if (!raw) return { v: 1, pins: [] }
    return normalizeStored(JSON.parse(raw))
  } catch {
    return { v: 1, pins: [] }
  }
}

export function isKindleReadBluePinOnRow(
  profileSlug: string,
  entry: VersePinSlotEntry,
  options?: KindleReadBluePinToggleOptions
): boolean {
  const state = loadKindleReadBluePins(profileSlug)
  return state.pins.some((pin) =>
    kindleReadBluePinMatchesRow(pin, entry, options?.kindleAnchor)
  )
}

/** Add pin when absent on row; remove when already pinned. Returns whether row is pinned after toggle. */
export function toggleKindleReadBluePin(
  profileSlug: string,
  entry: VersePinSlotEntry,
  options?: KindleReadBluePinToggleOptions
): { pinned: boolean; state: KindleReadBluePinsV1 } {
  const reference = entry.reference.trim()
  const sectionId = entry.sectionId.trim()
  const subsectionId = entry.subsectionId.trim()
  if (!reference || !sectionId || !subsectionId) {
    return { pinned: false, state: loadKindleReadBluePins(profileSlug) }
  }

  const normalized: VersePinSlotEntry = { reference, sectionId, subsectionId }
  const kindleAnchor = options?.kindleAnchor?.trim() || undefined
  const state = loadKindleReadBluePins(profileSlug)
  const existingIndex = state.pins.findIndex((pin) =>
    kindleReadBluePinMatchesRow(pin, normalized, kindleAnchor)
  )

  if (existingIndex >= 0) {
    state.pins.splice(existingIndex, 1)
    saveKindleReadBluePins(profileSlug, state)
    return { pinned: false, state }
  }

  state.pins.push({
    id: newKindleReadBluePinId(),
    reference,
    sectionId,
    subsectionId,
    ...(kindleAnchor ? { kindleAnchor } : {}),
  })
  saveKindleReadBluePins(profileSlug, state)
  return { pinned: true, state }
}
