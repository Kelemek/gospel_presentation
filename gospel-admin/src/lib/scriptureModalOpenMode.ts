import { normalizeScriptureReferenceString } from '@/lib/scriptureReferenceNormalize'

export type ScriptureCardAnchor = {
  reference: string
  sectionId: string
  subsectionId: string
}

/** Normalize refs for scripture-card identity (en-dash, spacing, abbrev → canonical). */
export function scriptureCardReferenceKey(reference: string): string {
  const trimmed = reference.trim().replace(/–/g, '-')
  if (!trimmed) return ''
  return normalizeScriptureReferenceString(trimmed)
}

/** True when section/subsection/reference match a profile scripture **card** (not Bible Reader / inline). */
export function isProfileScriptureCardAnchors(
  reference: string,
  sectionId: string,
  subsectionId: string,
  scriptureCards: readonly ScriptureCardAnchor[]
): boolean {
  const refKey = scriptureCardReferenceKey(reference)
  const sid = sectionId.trim()
  const subid = subsectionId.trim()
  if (!refKey || !sid || !subid) return false
  if (sid === 'modal-view' || subid === 'modal-view') return false
  return scriptureCards.some(
    (r) =>
      scriptureCardReferenceKey(r.reference) === refKey &&
      r.sectionId === sid &&
      r.subsectionId === subid
  )
}

export function scriptureCardReferencesMatch(a: string, b: string): boolean {
  return scriptureCardReferenceKey(a) === scriptureCardReferenceKey(b)
}

export type ScriptureCardAnchorLookup = {
  sectionId?: string
  subsectionId?: string
}

/** Find a scripture card in a nav list; optional section/subsection disambiguate duplicates. */
export function findScriptureCardInList(
  reference: string,
  scriptureCards: readonly ScriptureCardAnchor[],
  anchors?: ScriptureCardAnchorLookup
): ScriptureCardAnchor | undefined {
  const sectionId = anchors?.sectionId?.trim() ?? ''
  const subsectionId = anchors?.subsectionId?.trim() ?? ''
  if (sectionId && subsectionId) {
    const anchored = scriptureCards.find(
      (r) =>
        scriptureCardReferencesMatch(r.reference, reference) &&
        r.sectionId === sectionId &&
        r.subsectionId === subsectionId
    )
    if (anchored) return anchored
  }
  return scriptureCards.find((r) => scriptureCardReferencesMatch(r.reference, reference))
}

/** Index in a scripture-card nav list; `-1` when not found. */
export function indexOfScriptureCardInList(
  reference: string,
  scriptureCards: readonly ScriptureCardAnchor[],
  anchors?: ScriptureCardAnchorLookup
): number {
  const entry = findScriptureCardInList(reference, scriptureCards, anchors)
  return entry ? scriptureCards.indexOf(entry) : -1
}

/** Highlight picker (Bible Reader / picker / historical tabs); pins only for scripture-card opens. */
export function scriptureModalUsesHighlightPicker(input: {
  reference: string
  pickerNavigation?: boolean
  anchors?: ScriptureCardAnchor | null
  scriptureCards: readonly ScriptureCardAnchor[]
}): boolean {
  if (input.pickerNavigation) return true
  const ref = input.reference.trim()
  if (!ref) return true
  const snap = input.anchors
  if (!snap || !scriptureCardReferencesMatch(snap.reference, ref)) {
    return true
  }
  return !isProfileScriptureCardAnchors(
    snap.reference,
    snap.sectionId,
    snap.subsectionId,
    input.scriptureCards
  )
}
