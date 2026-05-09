import {
  preferLaterEquivalentListenTextBoundary,
  type ProfileListenTextOptions,
} from '@/lib/profileHighlightVisibleText'
import { locateListenRawTextOffset, readAlongListenBlockAncestor } from '@/lib/profileResourceListenText'
import { walkerOffsetForReadAlongPlainOffset } from '@/lib/scrollReadAlongPlain'

/** Thickness of each underline segment (viewport px). */
const READ_ALONG_UNDERLINE_THICKNESS_PX = 2

export const READ_ALONG_HIGHLIGHT_ROOT_ID = 'gospel-read-along-highlight-root'

/** What to paint after the next read-along UI flush (word span vs visual line at caret). */
export type ReadAlongHighlightPaint =
  | { kind: 'word'; start: number; endExclusive: number }
  | { kind: 'line'; plainCaret: number }

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
  listenTextOptions?: ProfileListenTextOptions
}): void {
  const { scope, plainCollapsedLen, plainStart, plainEndExclusive, listenTextOptions } = opts
  const doc = scope.ownerDocument
  const win = doc.defaultView
  if (!win) return

  const start = Math.max(0, Math.min(plainStart, plainCollapsedLen))
  const end = Math.max(start, Math.min(plainEndExclusive, plainCollapsedLen))
  if (end <= start) {
    clearReadAlongDomHighlight(doc)
    return
  }

  const wStart = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, start, listenTextOptions)
  const wEnd = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, end, listenTextOptions)

  const startRaw = locateListenRawTextOffset(scope, wStart, listenTextOptions)
  const endRaw = locateListenRawTextOffset(scope, wEnd, listenTextOptions)
  if (!startRaw || !endRaw) return

  const startP = preferLaterEquivalentListenTextBoundary(scope, startRaw, listenTextOptions)

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

  paintUnderlineRects(doc, root, rects)
}

/** Viewport Y tolerance (px) for matching `getClientRects()` rows to the caret line. */
const VISUAL_LINE_MATCH_PAD_PX = 4

export function clientRectsOnSameVisualLineAsCaret(
  caretRect: Pick<DOMRectReadOnly, 'top' | 'bottom' | 'height'>,
  rects: ReadonlyArray<Pick<DOMRectReadOnly, 'top' | 'bottom' | 'width' | 'height' | 'left'>>
): DOMRectReadOnly[] {
  const midY = caretRect.top + caretRect.height / 2
  return rects.filter((r) => {
    if (r.width <= 0 || r.height <= 0) return false
    return midY >= r.top - VISUAL_LINE_MATCH_PAD_PX && midY <= r.bottom + VISUAL_LINE_MATCH_PAD_PX
  }) as DOMRectReadOnly[]
}

function paintUnderlineRects(doc: Document, root: HTMLElement, rects: ReadonlyArray<DOMRectReadOnly>): void {
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

/**
 * Underlines every **wrapped visual line** in the current block that shares the caret’s row
 * (layout-based), using the same plain offset → DOM mapping as scrolling.
 */
export function updateReadAlongDomHighlightVisualLine(opts: {
  scope: HTMLElement
  plainCollapsedLen: number
  plainCaret: number
  listenTextOptions?: ProfileListenTextOptions
}): void {
  const { scope, plainCollapsedLen, plainCaret, listenTextOptions } = opts
  const doc = scope.ownerDocument
  const win = doc.defaultView
  if (!win) return

  const L = plainCollapsedLen
  if (L <= 0) {
    clearReadAlongDomHighlight(doc)
    return
  }

  const caretPlain = Math.max(0, Math.min(plainCaret, L - 1))
  const wCaret = walkerOffsetForReadAlongPlainOffset(scope, L, caretPlain, listenTextOptions)
  let rawPos = locateListenRawTextOffset(scope, wCaret, listenTextOptions)
  if (!rawPos) return
  rawPos = preferLaterEquivalentListenTextBoundary(scope, rawPos, listenTextOptions)

  const caretRange = doc.createRange()
  try {
    caretRange.setStart(rawPos.node, rawPos.offset)
    caretRange.collapse(true)
  } catch {
    return
  }

  const caretRect = caretRange.getBoundingClientRect()
  if (caretRect.height === 0 && caretRect.width === 0) return

  const block = readAlongListenBlockAncestor(rawPos.node, scope)
  const blockRange = doc.createRange()
  try {
    blockRange.selectNodeContents(block)
  } catch {
    return
  }

  const blockRects = [...blockRange.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
  let lineRects = clientRectsOnSameVisualLineAsCaret(caretRect, blockRects)

  if (lineRects.length === 0) {
    lineRects = [caretRect]
  }

  const root = ensureHighlightRoot(doc)
  root.replaceChildren()
  paintUnderlineRects(doc, root, lineRects)
}
