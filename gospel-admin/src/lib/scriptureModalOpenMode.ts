export type ScriptureCardAnchor = {
  reference: string
  sectionId: string
  subsectionId: string
}

/** True when section/subsection/reference match a profile scripture **card** (not Bible Reader / inline). */
export function isProfileScriptureCardAnchors(
  reference: string,
  sectionId: string,
  subsectionId: string,
  scriptureCards: readonly ScriptureCardAnchor[]
): boolean {
  const ref = reference.trim().replace(/–/g, '-')
  const sid = sectionId.trim()
  const subid = subsectionId.trim()
  if (!ref || !sid || !subid) return false
  if (sid === 'modal-view' || subid === 'modal-view') return false
  return scriptureCards.some(
    (r) => r.reference === ref && r.sectionId === sid && r.subsectionId === subid
  )
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
  if (!snap || snap.reference.trim().replace(/–/g, '-') !== ref.replace(/–/g, '-')) {
    return true
  }
  return !isProfileScriptureCardAnchors(
    snap.reference,
    snap.sectionId,
    snap.subsectionId,
    input.scriptureCards
  )
}
