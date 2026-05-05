'use client'

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { injectGospelInlineMarkersInHtml } from '@/lib/injectGospelInlineMarkersInHtml'
import { coerceHighlightMarkBlockChildren } from '@/lib/coerceHighlightMarkBlockChildren'
import { locateVisibleTextOffset, totalVisiblePlainTextLength } from '@/lib/profileHighlightVisibleText'
import type { VersePinAnchoredEntry } from '@/lib/versePinStorage'
import { anchoredPinMatchesDisplayRow } from '@/lib/versePinStorage'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import VersePinGlyph from '@/components/VersePinGlyph'
import { PILL_LINK_CLASS, PILL_STYLE, VERSE_PIN_PILL_STYLES } from '@/components/gospelInlinePillStyles'

type ScriptureClickHandler = (
  reference: string,
  anchorSectionId?: string,
  anchorSubsectionId?: string
) => void

type VersePinRemoveHandler = (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => void

function versePinForRow(
  versePins: VersePinAnchoredEntry[] | undefined,
  reference: string,
  anchorSectionId: string | undefined,
  anchorSubsectionId: string | undefined
): VersePinAnchoredEntry | null {
  if (!versePins?.length || !anchorSectionId || !anchorSubsectionId) return null
  return (
    versePins.find((pin) =>
      anchoredPinMatchesDisplayRow(pin, reference, anchorSectionId, anchorSubsectionId)
    ) ?? null
  )
}

export type GospelInlineHtmlProps = {
  html: string
  onComaClick: () => void
  onScriptureClick?: ScriptureClickHandler
  onFourRulesClick?: () => void
  anchorSectionId?: string
  anchorSubsectionId?: string
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
  highlights?: Array<{ id: string; startOffset: number; endOffset: number }>
  activeHighlightId?: string | null
  /** Click/tap highlighted text → parent may confirm + remove (`removeHighlight`). */
  onHighlightMarkClick?: (highlightId: string) => void
}

type PortalTarget =
  | { key: string; kind: 'coma'; el: Element; label: string }
  | { key: string; kind: 'fourRules'; el: Element }
  | { key: string; kind: 'scripture'; el: Element; reference: string }

/**
 * Renders stored rich HTML, then portals COMA / Four Rules / scripture UI into mount spans.
 * Uses createPortal (not createRoot) so ScriptureHoverModal stays under TranslationProvider.
 * Injects via `el.innerHTML` in layout (not `dangerouslySetInnerHTML` on every render) so React
 * does not replace mount nodes and destroy portal targets on re-render.
 *
 * Injection host is a **`div`** with **`display: contents`** so block tags like `<p>` stay in the
 * subtree in WebKit. A `<span>` host reparents block nodes as siblings, breaking offset-based
 * highlight placement (invalid `<mark>` → thin edge bars, wrong ink).
 */
export default function GospelInlineHtml({
  html,
  onComaClick,
  onScriptureClick,
  onFourRulesClick,
  anchorSectionId,
  anchorSubsectionId,
  versePins,
  onRemoveVersePin,
  highlights,
  activeHighlightId,
  onHighlightMarkClick,
}: GospelInlineHtmlProps) {
  const safeHtml = html ?? ''
  const [portals, setPortals] = useState<PortalTarget[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMarkedHighlightClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onHighlightMarkClick) return
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-gospel-mount]')) return
      if (target.closest('a[href], button, input, textarea, select, [role="button"]')) return

      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return

      const mark = target.closest('mark[data-resource-highlight-id]')
      const root = containerRef.current
      if (!mark || !root?.contains(mark)) return
      const id = mark.getAttribute('data-resource-highlight-id')?.trim()
      if (!id) return
      e.preventDefault()
      e.stopPropagation()
      onHighlightMarkClick(id)
    },
    [onHighlightMarkClick]
  )

  // Keep HTML injection + portal target discovery separate from highlight wrapping so
  // highlight-only updates (including active-ring toggles) do not wipe innerHTML —
  // full re-parse was visibly janky next to portals and could feel like shifting/hitching ink.
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const el = containerRef.current
    if (!el) return
    el.innerHTML = injectGospelInlineMarkersInHtml(safeHtml)

    const next: PortalTarget[] = []
    let idx = 0
    el.querySelectorAll('[data-gospel-mount="coma"]').forEach((node) => {
      next.push({
        key: `coma-${idx++}`,
        kind: 'coma',
        el: node,
        label: node.getAttribute('data-gospel-coma-label') ?? 'COMA',
      })
    })
    el.querySelectorAll('[data-gospel-mount="fourRules"]').forEach((node) => {
      next.push({ key: `four-${idx++}`, kind: 'fourRules', el: node })
    })
    el.querySelectorAll('[data-gospel-mount="scripture"]').forEach((node) => {
      const reference = node.getAttribute('data-gospel-ref')
      if (!reference) return
      next.push({ key: `scr-${idx++}-${reference}`, kind: 'scripture', el: node, reference })
    })
    setPortals(next)
  }, [safeHtml])

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const el = containerRef.current
    if (!el) return
    applyHighlightsToContainer(
      el,
      highlights ?? [],
      activeHighlightId ?? null,
      Boolean(onHighlightMarkClick)
    )
  }, [safeHtml, highlights, activeHighlightId, onHighlightMarkClick])

  const portalNodes: ReactNode[] = portals.map((t) => {
    if (t.kind === 'coma') {
      return createPortal(
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onComaClick()
          }}
          className={PILL_LINK_CLASS}
          style={PILL_STYLE}
          title="Learn about the C.O.M.A. method"
        >
          {t.label}
        </a>,
        t.el,
        t.key
      )
    }
    if (t.kind === 'fourRules') {
      return createPortal(
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFourRulesClick?.()
          }}
          className={PILL_LINK_CLASS}
          style={PILL_STYLE}
          title="View the Four Rules of Communication"
        >
          Four Rules of Communication
        </a>,
        t.el,
        t.key
      )
    }

    const reference = t.reference
    const rowPin =
      anchorSectionId != null && anchorSubsectionId != null
        ? versePinForRow(versePins, reference, anchorSectionId, anchorSubsectionId)
        : null

    if (onScriptureClick) {
      return createPortal(
        <ScriptureHoverModal reference={reference} hoverDelayMs={500} inline>
          <span className="relative inline-flex items-center" style={{ margin: '0 2px', verticalAlign: 'baseline' }}>
            <button
              type="button"
              className={rowPin ? VERSE_PIN_PILL_STYLES[rowPin.colorId].pill : PILL_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation()
                onScriptureClick(reference, anchorSectionId, anchorSubsectionId)
              }}
              style={{ fontSize: 'inherit' }}
              title={`Click to view ${reference}`}
            >
              {reference}
            </button>
            {rowPin && onRemoveVersePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveVersePin({ colorId: rowPin.colorId, bookmarkId: rowPin.bookmarkId })
                }}
                className={`absolute right-0 top-1/2 -translate-y-1/2 transition-colors cursor-pointer p-0.5 ${VERSE_PIN_PILL_STYLES[rowPin.colorId].unpinWrap}`}
                title="Remove pin for this passage"
                aria-label={`Remove ${rowPin.colorId} pin for ${reference}`}
              >
                <VersePinGlyph colorId={rowPin.colorId} />
              </button>
            )}
          </span>
        </ScriptureHoverModal>,
        t.el,
        t.key
      )
    }

    return createPortal(
      <span
        className="px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded whitespace-nowrap"
        style={PILL_STYLE}
      >
        {reference}
      </span>,
      t.el,
      t.key
    )
  })

  return (
    <>
      <div
        ref={containerRef}
        className="contents"
        suppressHydrationWarning
        onClick={onHighlightMarkClick ? handleMarkedHighlightClick : undefined}
      />
      {portalNodes}
    </>
  )
}

function unwrapRenderedHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-resource-highlight-id]')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  })
}

/**
 * Block containers we may intersect for split wrapping.
 * `<mark>` cannot wrap block nodes; prose often uses nested `<div>` lines instead of `<p>` — if we
 * miss those, we fall back to one big wrap and the parser “repairs” to thin edge marks.
 */
const HIGHLIGHT_WRAP_BLOCK_SELECTOR = 'p, blockquote, h1, h2, h3, h4, h5, h6, li, div'

function isBlockishChild(el: Element): boolean {
  const t = el.tagName
  return (
    t === 'DIV' ||
    t === 'P' ||
    t === 'BLOCKQUOTE' ||
    t === 'UL' ||
    t === 'OL' ||
    t === 'LI' ||
    /^H[1-6]$/i.test(t)
  )
}

function blockAncestorWithin(node: Node, scope: HTMLElement): HTMLElement | null {
  const base: Element | null = node instanceof Element ? node : node.parentElement
  let cur: HTMLElement | null = base instanceof HTMLElement ? base : null
  while (cur && cur !== scope) {
    const tag = cur.tagName
    if (tag === 'DIV' || tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'LI') return cur
    if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6')
      return cur
    cur = cur.parentElement
  }
  return null
}

function blockShouldSkipIntersectTarget(el: HTMLElement): boolean {
  if (el.tagName === 'DIV')
    return Array.from(el.children).some((c) => isBlockishChild(c))
  if (el.tagName === 'LI')
    return Array.from(el.children).some((c) => /^P$/i.test(c.tagName) || /^H[1-6]$/i.test(c.tagName))
  if (el.tagName === 'BLOCKQUOTE')
    return !!el.querySelector(
      ':scope > p, :scope > div, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol'
    )
  return false
}

function sameBlockElement(a: HTMLElement, b: HTMLElement): boolean {
  return a === b || (typeof a.isSameNode === 'function' && a.isSameNode(b))
}

function blockIndexInList(list: HTMLElement[], block: HTMLElement): number {
  return list.findIndex((el) => sameBlockElement(el, block))
}

/**
 * Smallest block-level split targets under `root` that still intersect `main` (e.g. two sibling `<p>`
 * under one wrapper `<div>` when start/end both resolve to that wrapper).
 */
function innermostIntersectingSplitBlocks(root: HTMLElement, main: Range): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll(HIGHLIGHT_WRAP_BLOCK_SELECTOR)).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  )
  const touching = nodes.filter(
    (el) =>
      root.contains(el) && main.intersectsNode(el) && !blockShouldSkipIntersectTarget(el)
  )
  return touching
    .filter((el) => !touching.some((a) => a !== el && a.contains(el)))
    .sort((a, b) => {
      const pos = a.compareDocumentPosition(b)
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
      return 0
    })
}

/** Non-null when `main` intersects `el`'s subtree in a non-collapsed slice. Caller must mutate before clones go stale. */
function intersectMainRangeWithElement(main: Range, el: HTMLElement): Range | null {
  // `compareBoundaryPoints(END_TO_START)` is *not* a reliable disjoint test when `main` spans
  // multiple block nodes (can return -1 for overlapping ranges in jsdom and browsers).
  if (!main.intersectsNode(el)) return null
  const doc = main.commonAncestorContainer.ownerDocument ?? document
  const inner = doc.createRange()
  inner.selectNodeContents(el)
  const out = doc.createRange()
  if (main.compareBoundaryPoints(Range.START_TO_START, inner) >= 0) {
    out.setStart(main.startContainer, main.startOffset)
  } else {
    out.setStart(inner.startContainer, inner.startOffset)
  }
  if (main.compareBoundaryPoints(Range.END_TO_END, inner) <= 0) {
    out.setEnd(main.endContainer, main.endOffset)
  } else {
    out.setEnd(inner.endContainer, inner.endOffset)
  }
  if (out.collapsed) return null
  return out
}

function attachHighlightMarkEl(doc: Document, id: string, active: boolean, bodyRemovable: boolean): HTMLElement {
  const mark = doc.createElement('mark')
  mark.setAttribute('data-resource-highlight-id', id)
  if (active) mark.setAttribute('data-resource-highlight-active', 'true')
  else mark.removeAttribute('data-resource-highlight-active')
  if (bodyRemovable) {
    mark.setAttribute('data-resource-highlight-removable', 'true')
    mark.title = 'Click to delete this highlight'
  } else {
    mark.removeAttribute('data-resource-highlight-removable')
    mark.removeAttribute('title')
  }
  return mark
}

function wrapRangeContentsInMark(range: Range, mark: HTMLElement): void {
  try {
    range.surroundContents(mark)
  } catch {
    const frag = range.extractContents()
    mark.appendChild(frag)
    range.insertNode(mark)
  }
  coerceHighlightMarkBlockChildren(mark)
}

function applySplitHighlightMarks(
  doc: Document,
  frozenMain: Range,
  blocks: HTMLElement[],
  highlightId: string,
  isActive: boolean,
  bodyHighlightRemovable: boolean,
  fallbackSingleWrap: () => void
): void {
  const parts: Range[] = []
  for (const block of blocks) {
    const sub = intersectMainRangeWithElement(frozenMain, block)
    if (sub) parts.push(sub)
  }
  if (parts.length === 0) {
    fallbackSingleWrap()
    return
  }
  parts.sort((a, b) => -a.compareBoundaryPoints(Range.START_TO_START, b))
  parts.forEach((sub) => {
    const mark = attachHighlightMarkEl(doc, highlightId, isActive, bodyHighlightRemovable)
    wrapRangeContentsInMark(sub, mark)
  })
}

function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: Array<{ id: string; startOffset: number; endOffset: number }>,
  activeHighlightId: string | null,
  bodyHighlightRemovable: boolean
): void {
  unwrapRenderedHighlights(container)
  if (!highlights.length) return

  const maxLen = totalVisiblePlainTextLength(container)
  const sorted = highlights
    .map((h) => ({
      ...h,
      startOffset: Math.max(0, Math.min(maxLen, h.startOffset)),
      endOffset: Math.max(0, Math.min(maxLen, h.endOffset)),
    }))
    .filter((h) => h.endOffset > h.startOffset)
    .sort((a, b) => b.startOffset - a.startOffset)

  sorted.forEach((h) => {
    const start = locateVisibleTextOffset(container, h.startOffset)
    const end = locateVisibleTextOffset(container, h.endOffset)
    if (!start || !end) return
    if (start.node === end.node && start.offset === end.offset) return

    try {
      const doc = container.ownerDocument
      if (!doc) return

      const mainRange = doc.createRange()
      mainRange.setStart(start.node, start.offset)
      mainRange.setEnd(end.node, end.offset)
      if (mainRange.collapsed) return

      const highlightId = h.id
      const isActive = highlightId === activeHighlightId

      const startBlock = blockAncestorWithin(start.node, container)
      const endBlock = blockAncestorWithin(end.node, container)

      const fallbackSingleWrap = (): void => {
        const mark = attachHighlightMarkEl(doc, highlightId, isActive, bodyHighlightRemovable)
        wrapRangeContentsInMark(mainRange.cloneRange(), mark)
      }

      // Prefer splitting whenever multiple leaf blocks intersect the range (covers cases where
      // block-ancestor metadata is wrong or parser quirks hoisted nodes).
      const containerSplit = innermostIntersectingSplitBlocks(container, mainRange)
      if (containerSplit.length >= 2) {
        applySplitHighlightMarks(
          doc,
          mainRange.cloneRange(),
          containerSplit,
          highlightId,
          isActive,
          bodyHighlightRemovable,
          fallbackSingleWrap
        )
        return
      }

      // Shared ancestor or missing block metadata: split on innermost intersecting blocks first
      let sharedRoot: HTMLElement | null = null
      if (startBlock && endBlock && sameBlockElement(startBlock, endBlock)) sharedRoot = startBlock
      else if (!startBlock || !endBlock) sharedRoot = container

      if (sharedRoot) {
        const inner = innermostIntersectingSplitBlocks(sharedRoot, mainRange)
        if (inner.length >= 2) {
          applySplitHighlightMarks(
            doc,
            mainRange.cloneRange(),
            inner,
            highlightId,
            isActive,
            bodyHighlightRemovable,
            fallbackSingleWrap
          )
          return
        }
      }

      if (!startBlock || !endBlock || sameBlockElement(startBlock, endBlock)) {
        fallbackSingleWrap()
        return
      }

      const all = Array.from(container.querySelectorAll(HIGHLIGHT_WRAP_BLOCK_SELECTOR)).filter(
        (n): n is HTMLElement => n instanceof HTMLElement
      )

      const usable = all.filter(
        (el) => container.contains(el) && !blockShouldSkipIntersectTarget(el)
      )

      const i0 = blockIndexInList(usable, startBlock)
      const i1 = blockIndexInList(usable, endBlock)
      if (i0 < 0 || i1 < 0) {
        const inner = innermostIntersectingSplitBlocks(container, mainRange)
        if (inner.length >= 2) {
          applySplitHighlightMarks(
            doc,
            mainRange.cloneRange(),
            inner,
            highlightId,
            isActive,
            bodyHighlightRemovable,
            fallbackSingleWrap
          )
          return
        }
        fallbackSingleWrap()
        return
      }

      const lo = Math.min(i0, i1)
      const hi = Math.max(i0, i1)
      const sliceBlocks = usable.slice(lo, hi + 1).filter((el) => {
        try {
          return mainRange.intersectsNode(el)
        } catch {
          return false
        }
      })
      if (sliceBlocks.length === 0) {
        const inner = innermostIntersectingSplitBlocks(container, mainRange)
        if (inner.length >= 2) {
          applySplitHighlightMarks(
            doc,
            mainRange.cloneRange(),
            inner,
            highlightId,
            isActive,
            bodyHighlightRemovable,
            fallbackSingleWrap
          )
          return
        }
        fallbackSingleWrap()
        return
      }
      applySplitHighlightMarks(
        doc,
        mainRange.cloneRange(),
        sliceBlocks,
        highlightId,
        isActive,
        bodyHighlightRemovable,
        fallbackSingleWrap
      )
    } catch {
      // Skip malformed/overlapping ranges
    }
  })
}
