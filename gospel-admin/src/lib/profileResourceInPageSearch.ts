import { coerceHighlightMarkBlockChildren } from '@/lib/coerceHighlightMarkBlockChildren'
import { isWithinButton, isWithinGospelMount } from '@/lib/profileHighlightVisibleText'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { getProfileHeaderScrollOffset } from '@/lib/scrollToTocAnchor'

export const RESOURCE_SEARCH_MATCH_ATTR = 'data-resource-search-match'
export const RESOURCE_SEARCH_ACTIVE_ATTR = 'data-resource-search-active'

/** Only one ephemeral highlight is painted in the DOM at a time (large result sets). */
export const RESOURCE_SEARCH_MAX_DOM_MARKS = 1

/** Gap below sticky profile chrome (menu + tabs + search) when scrolling to a match. */
export const RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX = 8

export type PlainTextRange = { start: number; end: number }

export type SearchTextSegment = { node: Text; plainStart: number; plainEnd: number }

export type ProfileResourceSearchTextIndex = {
  plainText: string
  segments: SearchTextSegment[]
  segmentByNode: Map<Text, SearchTextSegment>
}

function isWithinScriptureCardButton(node: Node, scope: HTMLElement): boolean {
  let cur: Node | null = node
  while (cur && cur !== scope) {
    if (
      cur instanceof HTMLElement &&
      cur.tagName === 'BUTTON' &&
      cur.getAttribute('data-tour') === 'scripture-card'
    ) {
      return true
    }
    cur = cur.parentNode
  }
  return false
}

function isSearchTextNodeExcluded(node: Text, scope: HTMLElement): boolean {
  if (isWithinGospelMount(node, scope)) return true
  if (isWithinButton(node, scope) && !isWithinScriptureCardButton(node, scope)) return true
  let cur: Node | null = node
  while (cur && cur !== scope) {
    if (cur instanceof Element && cur.hasAttribute(RESOURCE_SEARCH_MATCH_ATTR)) return true
    cur = cur.parentNode
  }
  return false
}

function previousSearchTextNodeBefore(scope: HTMLElement, next: Text): Text | null {
  const doc = scope.ownerDocument
  if (!doc) return null

  let last: Text | null = null
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text) || isSearchTextNodeExcluded(step, scope)) continue
    if (step === next) return last
    last = step
  }
  return null
}

function nextSearchTextNodeAfter(scope: HTMLElement, prev: Text): Text | null {
  const doc = scope.ownerDocument
  if (!doc) return null

  let seenPrev = false
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text) || isSearchTextNodeExcluded(step, scope)) continue
    if (seenPrev) return step
    if (step === prev) seenPrev = true
  }
  return null
}

/** One tree walk: plain-text stream + segment map for offset resolution. */
export function buildProfileResourceSearchTextIndex(
  scope: HTMLElement
): ProfileResourceSearchTextIndex {
  const doc = scope.ownerDocument
  const segments: SearchTextSegment[] = []
  const segmentByNode = new Map<Text, SearchTextSegment>()
  if (!doc) return { plainText: '', segments, segmentByNode }

  const parts: string[] = []
  let running = 0
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node instanceof Text && !isSearchTextNodeExcluded(node, scope)) {
      const text = node.textContent ?? ''
      if (text.length > 0) {
        const seg: SearchTextSegment = {
          node,
          plainStart: running,
          plainEnd: running + text.length,
        }
        segments.push(seg)
        segmentByNode.set(node, seg)
        parts.push(text)
        running += text.length
      }
    }
    node = walker.nextNode()
  }

  return { plainText: parts.join(''), segments, segmentByNode }
}

/** Collapsed plain-text stream for profile body search (matches highlight offset space). */
export function buildProfileResourceSearchPlainText(scope: HTMLElement): string {
  return buildProfileResourceSearchTextIndex(scope).plainText
}

export function locatePlainOffsetInSearchIndex(
  index: ProfileResourceSearchTextIndex,
  targetOffset: number
): { node: Text; offset: number } | null {
  const { segments } = index
  if (segments.length === 0) return null

  let lo = 0
  let hi = segments.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const seg = segments[mid]!
    if (targetOffset < seg.plainStart) {
      hi = mid - 1
    } else if (targetOffset > seg.plainEnd) {
      lo = mid + 1
    } else if (targetOffset === seg.plainEnd) {
      return { node: seg.node, offset: seg.node.length }
    } else {
      return { node: seg.node, offset: targetOffset - seg.plainStart }
    }
  }

  const last = segments[segments.length - 1]!
  if (targetOffset === last.plainEnd) {
    return { node: last.node, offset: last.node.length }
  }
  return null
}

function preferLaterSearchTextBoundary(
  scope: HTMLElement,
  point: { node: Text; offset: number },
  plainGoal: number,
  segmentByNode: Map<Text, SearchTextSegment>
): { node: Text; offset: number } {
  let cur = point
  let guard = 0
  while (guard++ < 512) {
    if (cur.offset !== cur.node.length) break
    const nx = nextSearchTextNodeAfter(scope, cur.node)
    if (!nx) break
    const seg = segmentByNode.get(nx)
    if (!seg || seg.plainStart !== plainGoal) break
    cur = { node: nx, offset: 0 }
  }
  return cur
}

function preferEarlierSearchTextBoundary(
  scope: HTMLElement,
  point: { node: Text; offset: number },
  plainGoal: number,
  segmentByNode: Map<Text, SearchTextSegment>
): { node: Text; offset: number } {
  let cur = point
  let guard = 0
  while (guard++ < 512) {
    if (cur.offset !== 0) break
    const prev = previousSearchTextNodeBefore(scope, cur.node)
    if (!prev) break
    const seg = segmentByNode.get(prev)
    const prevEnd = prev.length
    if (!seg || seg.plainEnd !== plainGoal) break
    cur = { node: prev, offset: prevEnd }
  }
  return cur
}

/** Case-insensitive, non-overlapping substring matches on the plain-text stream. */
export function findProfileResourceSearchMatches(
  plainText: string,
  query: string
): PlainTextRange[] {
  const needle = query.trim()
  if (!needle) return []

  const haystack = plainText.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const ranges: PlainTextRange[] = []
  let from = 0
  while (from <= haystack.length) {
    const idx = haystack.indexOf(lowerNeedle, from)
    if (idx === -1) break
    ranges.push({ start: idx, end: idx + needle.length })
    from = idx + needle.length
  }
  return ranges
}

function blockAncestorWithin(node: Node, scope: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement
  while (cur && cur !== scope) {
    const tag = cur.tagName
    if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6')
      return cur
    if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'LI') return cur
    if (tag === 'A') {
      const tour = cur.getAttribute('data-tour')
      if (tour === 'external-resource-card' || tour === 'profile-section-external-link') return cur
    }
    if (tag === 'DIV') {
      if (cur.classList.contains('contents')) {
        cur = cur.parentElement
        continue
      }
      const parentTag = cur.parentElement?.tagName ?? ''
      if (/^H[1-6]$/.test(parentTag)) {
        cur = cur.parentElement
        continue
      }
      return cur
    }
    cur = cur.parentElement
  }
  return null
}

function intersectMainRangeWithElement(main: Range, el: HTMLElement): Range | null {
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

function unwrapSearchMark(mark: HTMLElement): void {
  const parent = mark.parentNode
  if (!parent) return
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
  parent.removeChild(mark)
}

function unwrapEmptySearchMark(mark: HTMLElement): boolean {
  if ((mark.textContent ?? '').trim().length > 0) return false
  unwrapSearchMark(mark)
  return true
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

function cleanupOrphanedEmptyHeadings(scope: HTMLElement): void {
  scope.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => {
    if ((el.textContent ?? '').trim().length > 0) return
    el.remove()
  })
}

function attachSearchMarkEl(doc: Document, isActive: boolean): HTMLElement {
  const mark = doc.createElement('mark')
  mark.setAttribute(RESOURCE_SEARCH_MATCH_ATTR, 'true')
  if (isActive) mark.setAttribute(RESOURCE_SEARCH_ACTIVE_ATTR, 'true')
  return mark
}

export function clearProfileResourceSearchMarks(scope: HTMLElement | null): void {
  if (!scope) return
  const marks = scope.querySelectorAll(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  })
}

export function prefersReducedMotionResourceSearch(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const RESOURCE_SEARCH_INPUT_LABEL = 'Search in resource'

function isIosResourceSearchInputFocused(): boolean {
  if (!isMemorizeIosWebHost()) return false
  const active = document.activeElement
  return (
    active instanceof HTMLInputElement &&
    active.getAttribute('aria-label') === RESOURCE_SEARCH_INPUT_LABEL
  )
}

function dismissIosSearchKeyboardForScroll(): void {
  if (!isIosResourceSearchInputFocused()) return
  ;(document.activeElement as HTMLInputElement).blur()
}

/** True when the mark sits below the sticky header and above the keyboard (iOS visual viewport). */
export function isProfileResourceSearchMarkInComfortZone(
  mark: HTMLElement,
  headerOffsetPx: number
): boolean {
  const rect = mark.getBoundingClientRect()
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  const viewBottom = vv
    ? vv.offsetTop + vv.height - RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX
    : typeof window !== 'undefined'
      ? window.innerHeight
      : 0
  return rect.top >= headerOffsetPx && rect.bottom <= viewBottom
}

function scrollMarkBelowProfileHeaderWithWindowScroll(
  mark: HTMLElement,
  offset: number,
  behavior: ScrollBehavior
): void {
  const top = Math.max(0, mark.getBoundingClientRect().top + window.scrollY - offset)
  window.scrollTo({ top, behavior })
}

function scrollProfileResourceSearchMarkIntoView(
  mark: HTMLElement,
  offset: number,
  behavior: ScrollBehavior
): void {
  // Use one robust path across Android + iOS + desktop:
  // explicit top offset under sticky header via window scroll.
  scrollMarkBelowProfileHeaderWithWindowScroll(mark, offset, behavior)
}

export type ScrollProfileResourceSearchToMarkOptions = {
  /** Dismiss the iOS search keyboard before scrolling (prev/next navigation only). */
  dismissKeyboard?: boolean
}

export function scrollProfileResourceSearchToMark(
  mark: HTMLElement | null | undefined,
  options?: ScrollProfileResourceSearchToMarkOptions
): void {
  if (!mark || typeof window === 'undefined') return
  const offset = getProfileHeaderScrollOffset() + RESOURCE_SEARCH_MATCH_SCROLL_GAP_PX
  const behavior =
    prefersReducedMotionResourceSearch() || isMemorizeIosWebHost() ? 'auto' : 'smooth'

  const needsScroll = !isProfileResourceSearchMarkInComfortZone(mark, offset)
  const performScroll = () => {
    if (!needsScroll) return
    scrollProfileResourceSearchMarkIntoView(mark, offset, behavior)
  }

  const iosSearchInputFocused = isIosResourceSearchInputFocused()

  if (isMemorizeIosWebHost() && options?.dismissKeyboard) {
    dismissIosSearchKeyboardForScroll()
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(performScroll)
    })
    return
  }

  // iOS Safari/WebView: programmatic scrolling while keyboard is open can eject sticky header.
  // During typing, keep keyboard + sticky chrome stable and skip auto-scroll.
  if (isMemorizeIosWebHost() && iosSearchInputFocused) {
    return
  }

  if (!needsScroll) return

  performScroll()
}

function resolveSearchRangeDomBounds(
  scope: HTMLElement,
  range: PlainTextRange,
  index: ProfileResourceSearchTextIndex
): { start: { node: Text; offset: number }; end: { node: Text; offset: number } } | null {
  const startRaw = locatePlainOffsetInSearchIndex(index, range.start)
  const endRaw = locatePlainOffsetInSearchIndex(index, range.end)
  if (!startRaw || !endRaw) return null
  const start = preferLaterSearchTextBoundary(
    scope,
    startRaw,
    range.start,
    index.segmentByNode
  )
  const end = preferEarlierSearchTextBoundary(scope, endRaw, range.end, index.segmentByNode)
  if (start.node === end.node && start.offset === end.offset) return null
  return { start, end }
}

export function filterValidProfileResourceSearchRanges(
  scope: HTMLElement,
  ranges: PlainTextRange[],
  index: ProfileResourceSearchTextIndex
): PlainTextRange[] {
  return ranges.filter((range) => {
    const bounds = resolveSearchRangeDomBounds(scope, range, index)
    if (!bounds) return false
    const startBlock = blockAncestorWithin(bounds.start.node, scope)
    const endBlock = blockAncestorWithin(bounds.end.node, scope)
    return Boolean(startBlock && endBlock && startBlock === endBlock)
  })
}

function applySearchMarkForRange(
  scope: HTMLElement,
  range: PlainTextRange,
  index: ProfileResourceSearchTextIndex,
  isActive: boolean
): HTMLElement | null {
  const doc = scope.ownerDocument
  if (!doc) return null

  const bounds = resolveSearchRangeDomBounds(scope, range, index)
  if (!bounds) return null

  try {
    const mainRange = doc.createRange()
    mainRange.setStart(bounds.start.node, bounds.start.offset)
    mainRange.setEnd(bounds.end.node, bounds.end.offset)
    if (mainRange.collapsed) return null

    const startBlock = blockAncestorWithin(bounds.start.node, scope)
    const endBlock = blockAncestorWithin(bounds.end.node, scope)
    if (!startBlock || !endBlock || startBlock !== endBlock) return null

    const clipped = intersectMainRangeWithElement(mainRange, startBlock)
    if (!clipped) return null

    const mark = attachSearchMarkEl(doc, isActive)
    wrapRangeContentsInMark(clipped, mark)
    if (unwrapEmptySearchMark(mark)) return null
    return mark
  } catch {
    return null
  }
}

/** @deprecated Prefer {@link runProfileResourceSearch} (single active mark). Kept for tests. */
export function applyProfileResourceSearchMarks(
  scope: HTMLElement,
  ranges: PlainTextRange[],
  activeIndex: number,
  index?: ProfileResourceSearchTextIndex
): HTMLElement[] {
  const textIndex = index ?? buildProfileResourceSearchTextIndex(scope)
  const valid = filterValidProfileResourceSearchRanges(scope, ranges, textIndex)
  const doc = scope.ownerDocument
  if (!doc || valid.length === 0) return []

  const target = valid[Math.max(0, Math.min(activeIndex, valid.length - 1))]!
  const mark = applySearchMarkForRange(scope, target, textIndex, true)
  cleanupOrphanedEmptyHeadings(scope)
  return mark ? [mark] : []
}

export function setProfileResourceSearchActiveIndex(
  marks: HTMLElement[],
  activeIndex: number
): void {
  marks.forEach((mark, i) => {
    if (i === activeIndex) mark.setAttribute(RESOURCE_SEARCH_ACTIVE_ATTR, 'true')
    else mark.removeAttribute(RESOURCE_SEARCH_ACTIVE_ATTR)
  })
}

export type ProfileResourceSearchHandle = {
  count: number
  marks: HTMLElement[]
  scrollToIndex: (index: number) => void
  clear: () => void
}

export function runProfileResourceSearch(
  scope: HTMLElement | null,
  query: string,
  options?: { activeIndex?: number }
): ProfileResourceSearchHandle {
  const clear = () => clearProfileResourceSearchMarks(scope)

  if (!scope) {
    return { count: 0, marks: [], scrollToIndex: () => {}, clear }
  }

  clearProfileResourceSearchMarks(scope)

  const trimmed = query.trim()
  if (!trimmed) {
    return { count: 0, marks: [], scrollToIndex: () => {}, clear }
  }

  const textIndex = buildProfileResourceSearchTextIndex(scope)
  const ranges = findProfileResourceSearchMatches(textIndex.plainText, trimmed)
  const validRanges = filterValidProfileResourceSearchRanges(scope, ranges, textIndex)
  const activeIndex =
    validRanges.length === 0
      ? -1
      : Math.max(0, Math.min(options?.activeIndex ?? 0, validRanges.length - 1))

  let activeMark: HTMLElement | null = null

  const paintActive = (index: number) => {
    clearProfileResourceSearchMarks(scope)
    activeMark = null
    if (index < 0 || index >= validRanges.length) return
    // Re-index after unwrap so text-node references stay valid across navigation.
    const freshIndex = buildProfileResourceSearchTextIndex(scope)
    activeMark = applySearchMarkForRange(scope, validRanges[index]!, freshIndex, true)
    cleanupOrphanedEmptyHeadings(scope)
  }

  paintActive(activeIndex)
  if (activeMark) scrollProfileResourceSearchToMark(activeMark)

  const scrollToIndex = (index: number) => {
    if (validRanges.length === 0) return
    const clamped = Math.max(0, Math.min(index, validRanges.length - 1))
    paintActive(clamped)
    scrollProfileResourceSearchToMark(activeMark, { dismissKeyboard: true })
  }

  return {
    count: validRanges.length,
    marks: activeMark ? [activeMark] : [],
    scrollToIndex,
    clear,
  }
}
