import { kindleReadScriptureAnchorLookup } from '@/lib/kindleReadScriptureCardNav'
import { kindleReadBluePinMatchesRow, loadKindleReadBluePins } from '@/lib/kindleReadBluePinStorage'
import {
  kindleReadLastCardMatchesRow,
  loadKindleReadLastCard,
  saveKindleReadLastCard,
} from '@/lib/kindleReadLastCardStorage'
import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import { isMcheynePlanScriptureCardOpen } from '@/lib/mcheyne/mcheynePlanCardPin'
import type { VersePinSlotEntry } from '@/lib/versePinStorage'

const KINDLE_READ_SCRIPTURE_CARD_ANCHOR = /-card-\d+$/

export function isKindleReadScriptureCardAnchor(anchor: string | null | undefined): boolean {
  return KINDLE_READ_SCRIPTURE_CARD_ANCHOR.test(anchor?.trim() ?? '')
}

/** Profile slug from `/<slug>/read/` paths; null on scripture or other routes. */
export function kindleReadProfileSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/read\/?$/)
  if (!match?.[1] || match[1] === 'read') return null
  return decodeURIComponent(match[1])
}

export function versePinEntryFromKindleScriptureParams(
  fromSlug: string | null | undefined,
  reference: string | null | undefined,
  anchor: string | null | undefined
): VersePinSlotEntry | null {
  const slug = fromSlug?.trim()
  const ref = reference?.trim()
  const anchorTrim = anchor?.trim()
  if (!slug || !ref || !anchorTrim || !isKindleReadScriptureCardAnchor(anchorTrim)) {
    return null
  }

  const lookup = kindleReadScriptureAnchorLookup(anchorTrim)
  if (!lookup?.sectionId || !lookup.subsectionId) return null

  return {
    reference: ref,
    sectionId: lookup.sectionId,
    subsectionId: lookup.subsectionId,
  }
}

export function shouldSaveKindleReadScriptureCardProgress(
  profileSlug: string,
  anchor: string | null | undefined
): boolean {
  if (!isKindleReadScriptureCardAnchor(anchor)) return false
  if (!isMcheyneProfileSlug(profileSlug)) return true

  const lookup = kindleReadScriptureAnchorLookup(anchor)
  return isMcheynePlanScriptureCardOpen(
    profileSlug,
    lookup?.sectionId,
    lookup?.subsectionId
  )
}

/** Persist last opened scripture card for this Kindle read profile. */
export function saveKindleReadLastScriptureCard(
  fromSlug: string,
  reference: string,
  anchor: string | null | undefined
): boolean {
  if (!shouldSaveKindleReadScriptureCardProgress(fromSlug, anchor)) return false

  const entry = versePinEntryFromKindleScriptureParams(fromSlug, reference, anchor)
  if (!entry) return false

  return saveKindleReadLastCard(fromSlug, entry)
}

export function kindleReadScriptureCardRowFromElement(card: Element): VersePinSlotEntry | null {
  const id = card.getAttribute('id')
  if (!id || !isKindleReadScriptureCardAnchor(id)) return null

  const link = card.querySelector('a.kindle-read-scripture-link')
  const reference = link?.textContent?.trim() ?? ''
  if (!reference) return null

  const lookup = kindleReadScriptureAnchorLookup(id)
  if (!lookup?.sectionId || !lookup.subsectionId) return null

  return {
    reference,
    sectionId: lookup.sectionId,
    subsectionId: lookup.subsectionId,
  }
}

export const KINDLE_READ_YELLOW_PIN_CARD_CLASS = 'kindle-read-scripture-card--yellow-pin'
export const KINDLE_READ_BLUE_PIN_CARD_CLASS = 'kindle-read-scripture-card--blue-pin'

function clearKindleReadPinCardClasses(): void {
  document
    .querySelectorAll(
      `.${KINDLE_READ_YELLOW_PIN_CARD_CLASS}, .${KINDLE_READ_BLUE_PIN_CARD_CLASS}`
    )
    .forEach((el) => {
      el.classList.remove(KINDLE_READ_YELLOW_PIN_CARD_CLASS, KINDLE_READ_BLUE_PIN_CARD_CLASS)
    })
}

/** Mark profile read page cards for yellow last-read and blue manual pins. */
export function applyKindleReadVersePinHighlights(profileSlug: string): HTMLElement | null {
  if (typeof document === 'undefined') return null

  clearKindleReadPinCardClasses()

  const lastCard = loadKindleReadLastCard(profileSlug)
  const bluePins = loadKindleReadBluePins(profileSlug).pins

  let resumeElement: HTMLElement | null = null
  document.querySelectorAll('.kindle-read-scripture-card[id]').forEach((card) => {
    const row = kindleReadScriptureCardRowFromElement(card)
    if (!row) return

    if (lastCard && kindleReadLastCardMatchesRow(lastCard, row)) {
      card.classList.add(KINDLE_READ_YELLOW_PIN_CARD_CLASS)
      if (card instanceof HTMLElement) {
        resumeElement = card
      }
    }

    if (bluePins.some((pin) => kindleReadBluePinMatchesRow(pin, row, card.getAttribute('id')))) {
      card.classList.add(KINDLE_READ_BLUE_PIN_CARD_CLASS)
    }
  })

  return resumeElement
}

export function applyKindleReadVersePinHighlightsWithScroll(
  profileSlug: string,
  options?: { scrollIntoView?: boolean }
): void {
  const resumeElement = applyKindleReadVersePinHighlights(profileSlug)
  if (!options?.scrollIntoView || !resumeElement) {
    return
  }

  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  // Calendar/TOC day links use subsection hashes — keep native hash scroll (scroll-margin-top).
  if (hash && !isKindleReadScriptureCardAnchor(hash)) {
    return
  }

  resumeElement.scrollIntoView({ block: 'center', behavior: 'auto' })
}
