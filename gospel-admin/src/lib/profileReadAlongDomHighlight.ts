import {
  locateListenVisibleTextOffset,
  preferLaterEquivalentListenTextBoundary,
} from '@/lib/profileHighlightVisibleText'
import { walkerOffsetForReadAlongPlainOffset } from '@/lib/scrollReadAlongPlain'

/** Thickness of each underline segment (viewport px). */
const READ_ALONG_UNDERLINE_THICKNESS_PX = 2

export const READ_ALONG_HIGHLIGHT_ROOT_ID = 'gospel-read-along-highlight-root'

/**
 * Clears read-along underline segments (does not remove the root node).
 */
export function clearReadAlongDomHighlight(doc: Document): void {
  const root = doc.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)
  if (root) root.replaceChildren()
}

function ensureHighlightRoot(doc: Document): HTMLElement {
  /** Below sticky header (40), slide-out drawer (50), dropdown backdrops (55); above article body. */
  const className =
    'fixed inset-0 pointer-events-none z-35 overflow-hidden print:hidden'
  let root = doc.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)
  if (!root) {
    root = doc.createElement('div')
    root.id = READ_ALONG_HIGHLIGHT_ROOT_ID
    root.setAttribute('aria-hidden', 'true')
    root.className = className
    doc.body.appendChild(root)
  } else {
    root.className = className
  }
  return root as HTMLElement
}

/**
 * Draws fixed-position **underlines** for plain-text range `[plainStart, plainEndExclusive)`
 * (indices into the same collapsed string as {@link plainTextForProfileResourceListen}), mapped into
 * the visible-text walker stream like read-along scrolling.
 */
export function updateReadAlongDomHighlight(opts: {
  scope: HTMLElement
  plainCollapsedLen: number
  plainStart: number
  plainEndExclusive: number
}): void {
  const { scope, plainCollapsedLen, plainStart, plainEndExclusive } = opts
  const doc = scope.ownerDocument
  const win = doc.defaultView
  if (!win) return

  const start = Math.max(0, Math.min(plainStart, plainCollapsedLen))
  const end = Math.max(start, Math.min(plainEndExclusive, plainCollapsedLen))
  if (end <= start) {
    clearReadAlongDomHighlight(doc)
    return
  }

  const wStart = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, start)
  const wEnd = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, end)

  const startRaw = locateListenVisibleTextOffset(scope, wStart)
  const endRaw = locateListenVisibleTextOffset(scope, wEnd)
  if (!startRaw || !endRaw) return

  const startP = preferLaterEquivalentListenTextBoundary(scope, startRaw)

  const range = doc.createRange()
  try {
    range.setStart(startP.node, startP.offset)
    range.setEnd(endRaw.node, endRaw.offset)
    if (range.collapsed) return
  } catch {
    return
  }

  const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
  const root = ensureHighlightRoot(doc)
  root.replaceChildren()

  for (const rect of rects) {
    const div = doc.createElement('div')
    div.className =
      'pointer-events-none rounded-full bg-amber-600 opacity-90 dark:bg-amber-400 dark:opacity-95'
    div.style.position = 'fixed'
    div.style.top = `${rect.bottom}px`
    div.style.left = `${rect.left}px`
    div.style.width = `${rect.width}px`
    div.style.height = `${READ_ALONG_UNDERLINE_THICKNESS_PX}px`
    div.style.boxSizing = 'border-box'
    root.appendChild(div)
  }
}
