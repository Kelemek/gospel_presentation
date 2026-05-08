import {
  locateVisibleTextOffset,
  preferLaterEquivalentTextBoundary,
  totalVisiblePlainTextLength,
} from '@/lib/profileHighlightVisibleText'

/**
 * Maps an offset into {@link plainTextForProfileResourceListen} (single-space collapsed) to an
 * approximate offset in the highlight/walker visible-text stream. Lengths often differ (innerText
 * vs raw text nodes); proportional mapping keeps scroll position roughly aligned for read-along.
 */
export function walkerOffsetForReadAlongPlainOffset(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number
): number {
  const walkerLen = totalVisiblePlainTextLength(scope)
  if (walkerLen <= 0 || plainCollapsedLen <= 0) return 0
  const clamped = Math.max(0, Math.min(plainOffset, plainCollapsedLen))
  return Math.min(walkerLen, Math.round((clamped / plainCollapsedLen) * walkerLen))
}

export function prefersReducedMotionReadAlong(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Scrolls so the plain-text position (collapsed offset into the spoken string) sits near the
 * vertical center of the viewport.
 */
export function scrollReadAlongPlainOffsetIntoViewCenter(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (typeof window === 'undefined') return
  const win = scope.ownerDocument?.defaultView
  if (!win) return

  const walkerOff = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, plainOffset)
  let pos = locateVisibleTextOffset(scope, walkerOff)
  if (!pos) return
  pos = preferLaterEquivalentTextBoundary(scope, pos)

  const doc = scope.ownerDocument
  const r = doc.createRange()
  try {
    r.setStart(pos.node, pos.offset)
    r.collapse(true)
  } catch {
    return
  }

  const rect = r.getBoundingClientRect()
  if (rect.height === 0 && rect.width === 0) return

  const vpH = win.innerHeight
  const lineCenter = rect.top + rect.height / 2
  const delta = lineCenter - vpH / 2
  win.scrollBy({ top: delta, behavior })
}
