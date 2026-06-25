import { kindleReadScriptureAnchorLookup } from '@/lib/kindleReadScriptureCardNav'
import { pinnedVerseMatchesRow, type VersePinSlotEntry } from '@/lib/versePinStorage'

/** Kindle read mode only — plain localStorage (not shared with the main app or other devices). */
export const KINDLE_READ_LAST_CARD_KEY_PREFIX = 'kindle-read-last-card-'

export type KindleReadLastCardV1 = {
  v: 1
  reference: string
  sectionId: string
  subsectionId: string
}

export function kindleReadLastCardStorageKey(profileSlug: string): string {
  return `${KINDLE_READ_LAST_CARD_KEY_PREFIX}${profileSlug.trim()}`
}

function normalizeKindleReadLastCard(raw: unknown): KindleReadLastCardV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1) return null
  const reference = typeof o.reference === 'string' ? o.reference.trim() : ''
  if (!reference) return null

  const sectionId = typeof o.sectionId === 'string' ? o.sectionId.trim() : ''
  const subsectionId = typeof o.subsectionId === 'string' ? o.subsectionId.trim() : ''
  if (sectionId && subsectionId) {
    return { v: 1, reference, sectionId, subsectionId }
  }

  const anchor = typeof o.anchor === 'string' ? o.anchor.trim() : ''
  if (!anchor) return null
  const lookup = kindleReadScriptureAnchorLookup(anchor)
  if (!lookup?.sectionId || !lookup.subsectionId) return null
  return {
    v: 1,
    reference,
    sectionId: lookup.sectionId,
    subsectionId: lookup.subsectionId,
  }
}

export function loadKindleReadLastCard(profileSlug: string): KindleReadLastCardV1 | null {
  if (typeof window === 'undefined') return null
  const slug = profileSlug.trim()
  if (!slug) return null
  try {
    const raw = window.localStorage.getItem(kindleReadLastCardStorageKey(slug))
    if (!raw) return null
    return normalizeKindleReadLastCard(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveKindleReadLastCard(profileSlug: string, entry: VersePinSlotEntry): boolean {
  if (typeof window === 'undefined') return false
  const slug = profileSlug.trim()
  const reference = entry.reference.trim()
  const sectionId = entry.sectionId.trim()
  const subsectionId = entry.subsectionId.trim()
  if (!slug || !reference || !sectionId || !subsectionId) return false

  const payload: KindleReadLastCardV1 = {
    v: 1,
    reference,
    sectionId,
    subsectionId,
  }

  try {
    window.localStorage.setItem(kindleReadLastCardStorageKey(slug), JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function kindleReadLastCardMatchesRow(
  stored: KindleReadLastCardV1 | null,
  row: VersePinSlotEntry
): boolean {
  if (!stored) return false
  return pinnedVerseMatchesRow(stored, row)
}

/** Inline script: persist last card from scripture URL before React (Kindle). */
export function kindleReadLastCardStorageScriptContent(): string {
  const prefix = JSON.stringify(KINDLE_READ_LAST_CARD_KEY_PREFIX)
  return `(function(){try{var p=new URLSearchParams(location.search);var from=(p.get('from')||'').trim();var ref=(p.get('ref')||'').trim();var anchor=(p.get('anchor')||'').trim();if(!from||!ref||!/-card-\\d+$/.test(anchor))return;var payload=JSON.stringify({v:1,reference:ref,anchor:anchor});localStorage.setItem(${prefix}+from,payload);}catch(e){}})();`
}
