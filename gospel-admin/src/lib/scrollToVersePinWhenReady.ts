/**
 * Scroll profile content to a saved verse pin (subsection + optional yellow card).
 */

import {
  getProfileHeaderScrollOffset,
  scrollToTocAnchorWhenReady,
} from '@/lib/scrollToTocAnchor'
import type { VersePinSlotEntry } from '@/lib/versePinStorage'

function scrollElementWithHeaderOffset(el: HTMLElement, behavior: ScrollBehavior = 'auto'): void {
  const offset = getProfileHeaderScrollOffset()
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior })
}

function scrollYellowCardInSubsection(pin: VersePinSlotEntry, behavior: ScrollBehavior): void {
  const subsection = document.getElementById(pin.subsectionId)
  if (!subsection) return

  const ref = pin.reference.trim()
  const cards = subsection.querySelectorAll<HTMLElement>('[data-scripture-pin-color="yellow"]')
  for (const card of cards) {
    if (card.textContent?.trim() === ref) {
      scrollElementWithHeaderOffset(card, behavior)
      return
    }
  }

  const first = subsection.querySelector<HTMLElement>('[data-scripture-pin-color="yellow"]')
  if (first) scrollElementWithHeaderOffset(first, behavior)
}

/**
 * Retry scroll until the pin's subsection exists, then focus the yellow card when present.
 */
export function scrollToVersePinWhenReady(
  pin: VersePinSlotEntry,
  options?: {
    behavior?: ScrollBehavior
    maxFrames?: number
    onDone?: () => void
    onGiveUp?: () => void
  }
): () => void {
  const behavior = options?.behavior ?? 'auto'
  return scrollToTocAnchorWhenReady(pin.subsectionId, {
    behavior,
    maxFrames: options?.maxFrames,
    onDone: () => {
      scrollYellowCardInSubsection(pin, behavior)
      window.requestAnimationFrame(() => scrollYellowCardInSubsection(pin, behavior))
      options?.onDone?.()
    },
    onGiveUp: options?.onGiveUp,
  })
}
