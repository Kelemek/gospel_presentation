import type { VersePinColorId, VersePinSlotEntry, VerseBookmarkColorId } from '@/lib/versePinStorage'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import { scriptureCardReferencesMatch } from '@/lib/scriptureModalOpenMode'
import type { GospelSection } from '@/lib/types'
import { visibleTextLengthBeforeBoundary } from '@/lib/profileHighlightVisibleText'

/** One scripture card in profile order (for modal prev/next without collapsing duplicate references). */
export type ScriptureRefNav = {
  reference: string
  sectionId: string
  subsectionId: string
  /** Plain text, TOC-aligned (stripHtmlTags). */
  sectionTitle: string
  /** Parent subsection title (plain); nested cards use the same parent title here. */
  subsectionTitle: string
  /** Set only for scripture cards under `nestedSubsections`. */
  nestedSubsectionTitle?: string
}

/** Scripture modal open state (user selection, deep link, or picker navigation). */
export type ScriptureModalState = {
  reference: string
  isOpen: boolean
  initialChapterView?: boolean
  /** Prev/next move by verse/chapter in-book (Bible Reader or header passage picker). */
  pickerNavigation?: boolean
  /**
   * On `mchy`, yellow resume tracking after a plan card open (in-modal nav + Listen)
   * until the passage picker / Bible Reader is used.
   */
  mcheynePlanCardPin?: boolean
}

export type ScriptureCardAnchors = {
  reference: string
  sectionId: string
  subsectionId: string
}

export type ResolveScriptureCardAnchorsInput = {
  reference: string
  sections: GospelSection[]
  pinnedAnchors?: ScriptureCardAnchors | null
  explicit?: { sectionId?: string; subsectionId?: string }
}

/** Resolve scripture card anchors from explicit ids, pinned modal state, or section lookup. */
export function resolveScriptureCardAnchors({
  reference,
  sections,
  pinnedAnchors,
  explicit,
}: ResolveScriptureCardAnchorsInput): ScriptureCardAnchors {
  let sectionId = explicit?.sectionId?.trim() ?? ''
  let subsectionId = explicit?.subsectionId?.trim() ?? ''

  if (!sectionId || !subsectionId) {
    if (pinnedAnchors && scriptureCardReferencesMatch(pinnedAnchors.reference, reference)) {
      sectionId = pinnedAnchors.sectionId
      subsectionId = pinnedAnchors.subsectionId
    } else {
      const found = findFirstScriptureCardAnchors(sections, reference)
      if (found) {
        sectionId = found.sectionId
        subsectionId = found.subsectionId
      }
    }
  }

  if (sectionId && subsectionId) {
    return { reference, sectionId, subsectionId }
  }

  return {
    reference,
    sectionId: 'modal-view',
    subsectionId: 'modal-view',
  }
}

export function closestElement(node: Node | null, selector: string): HTMLElement | null {
  if (!node) return null
  const base = node instanceof Element ? node : node.parentElement
  if (!base) return null
  const found = base.closest(selector)
  return found instanceof HTMLElement ? found : null
}

export function isInsideHighlightIgnoredMount(node: Node | null): boolean {
  return !!closestElement(node, '[data-gospel-mount]')
}

export function versePinSlotEntryFromModalPinKey(pinKey: string): VersePinSlotEntry | null {
  const sep = pinKey.indexOf('|')
  if (sep < 0) return null
  const reference = pinKey.slice(0, sep).trim()
  const rest = pinKey.slice(sep + 1)
  const sep2 = rest.indexOf('|')
  if (sep2 < 0 || !reference) return null
  const sectionId = rest.slice(0, sep2)
  const subsectionId = rest.slice(sep2 + 1)
  return {
    reference,
    sectionId: sectionId || 'modal-view',
    subsectionId: subsectionId || 'modal-view',
  }
}

export function isVerseBookmarkColorId(color: VersePinColorId): color is VerseBookmarkColorId {
  return color !== 'yellow'
}

export function textOffsetWithinScope(scopeEl: HTMLElement, node: Node, nodeOffset: number): number {
  return visibleTextLengthBeforeBoundary(scopeEl, node, nodeOffset)
}
