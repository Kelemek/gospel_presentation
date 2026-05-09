/**
 * Canonical “visible plain text stream” used for storing and resolving profile text highlights.
 *
 * Mirrors {@link GospelInlineHtml} highlight placement: concatenate `Text` nodes under a root
 * in document order, **excluding** any text inside `[data-gospel-mount]` (inline scripture/COMA/Four
 * Rules portals). Mounts may contain visible reference labels; those characters are not part of
 * the offset space because `injectGospelInlineMarkersInHtml` removed the original ref text from HTML.
 */

export function isWithinGospelMount(node: Node, root: HTMLElement): boolean {
  let cur: Node | null = node
  while (cur && cur !== root) {
    if (cur instanceof Element && cur.hasAttribute('data-gospel-mount')) return true
    cur = cur.parentNode
  }
  return false
}

/** Text inside `<button>` is omitted from profile read-aloud (same as highlight/listen plain text). */
export function isWithinButton(node: Node, root: HTMLElement): boolean {
  let cur: Node | null = node
  while (cur && cur !== root) {
    if (cur instanceof Element && cur.tagName === 'BUTTON') return true
    cur = cur.parentNode
  }
  return false
}

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

/** Section / article headings are omitted from profile read-aloud (body copy only). */
export function isWithinHeading(node: Node, root: HTMLElement): boolean {
  let cur: Node | null = node
  while (cur && cur !== root) {
    if (cur instanceof Element && HEADING_TAGS.has(cur.tagName)) return true
    cur = cur.parentNode
  }
  return false
}

export function visibleTextLengthBeforeBoundary(
  scope: HTMLElement,
  boundaryNode: Node,
  boundaryOffset: number
): number {
  const doc = scope.ownerDocument
  if (!doc) return 0

  const boundary = doc.createRange()
  boundary.setStart(boundaryNode, boundaryOffset)
  boundary.collapse(true)

  let count = 0
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text)) continue
    if (isWithinGospelMount(step, scope)) continue
    const t = step
    const len = t.length
    for (let i = 0; i < len; i++) {
      const startOfChar = doc.createRange()
      startOfChar.setStart(t, i)
      startOfChar.collapse(true)
      const cmp = boundary.compareBoundaryPoints(Range.START_TO_START, startOfChar)
      if (cmp > 0) count++
      else return count
    }
  }
  return count
}

export function totalVisiblePlainTextLength(container: HTMLElement): number {
  const doc = container.ownerDocument
  if (!doc) return 0
  let total = 0
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (!isWithinGospelMount(node, container)) total += node.textContent?.length ?? 0
    node = walker.nextNode()
  }
  return total
}

function sortCollapsedTextBoundariesDocumentOrder(
  a: { node: Text; offset: number },
  b: { node: Text; offset: number }
): number {
  if (a.node === b.node) return a.offset - b.offset
  const pos = a.node.compareDocumentPosition(b.node)
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
  return 0
}

/**
 * Whether any `[data-gospel-mount]` subtree lies on the interior of the open range between two
 * collapsed text boundaries with the same visible offset — e.g. `Hello|MOUNT|world` shares a
 * stream index at both `(Hello,end)` and `(world,start)` without counting mount text.
 */
function hasGospelMountIntersectingOpenRangeBetween(
  scope: HTMLElement,
  first: { node: Text; offset: number },
  last: { node: Text; offset: number }
): boolean {
  const doc = scope.ownerDocument
  if (!doc) return false

  const r = doc.createRange()
  try {
    r.setStart(first.node, first.offset)
    r.setEnd(last.node, last.offset)
  } catch {
    return false
  }

  const mounts = scope.querySelectorAll('[data-gospel-mount]')
  for (let i = 0; i < mounts.length; i += 1) {
    try {
      if (r.intersectsNode(mounts[i]!)) return true
    } catch {
      // ignore unsupported / invalid intersections
    }
  }
  return false
}

/**
 * Collapsed `(Text, offset)` boundary for a streamed plain-text offset (eligible text only).
 *
 * When several collapsed DOM positions share the same stream index (`Hello|world`,
 * lone styled `</span>|<text`), we pick **later** DOM order so `Range`/wrap avoids a fragile
 * 1‑char span tail — **unless** a `data-gospel-mount` sits between the earliest and latest
 * equivalent points (`Hello|mount|world`), in which case we pick the **earlier** boundary so
 * highlights do not bridge across inline scripture/COMA mounts.
 */
export function locateVisibleTextOffset(
  container: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const doc = container.ownerDocument
  if (!doc) return null
  let running = 0
  const matches: Array<{ node: Text; offset: number }> = []
  let lastEligible: Text | null = null

  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text) || isWithinGospelMount(node, container)) {
      node = walker.nextNode()
      continue
    }
    const textNode = node
    lastEligible = textNode
    const len = textNode.length
    for (let offset = 0; offset <= len; offset += 1) {
      if (running + offset === targetOffset) {
        matches.push({ node: textNode, offset })
      }
    }
    running += len
    node = walker.nextNode()
  }

  if (matches.length > 0) {
    matches.sort(sortCollapsedTextBoundariesDocumentOrder)
    const first = matches[0]!
    const last = matches[matches.length - 1]!
    if (first.node === last.node && first.offset === last.offset) return first
    if (hasGospelMountIntersectingOpenRangeBetween(container, first, last)) return first
    return last
  }

  if (lastEligible) {
    const len = lastEligible.length
    return { node: lastEligible, offset: len }
  }
  return null
}

function listenIneligibleText(node: Text, scope: HTMLElement): boolean {
  return (
    isWithinGospelMount(node, scope) ||
    isWithinButton(node, scope) ||
    isWithinHeading(node, scope)
  )
}

/** Same as {@link locateVisibleTextOffset} but skips `[data-gospel-mount]`, `<button>`, and `h1`–`h6` — matches {@link visibleListenRawText}. */
export function locateListenVisibleTextOffset(
  container: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const doc = container.ownerDocument
  if (!doc) return null
  let running = 0
  const matches: Array<{ node: Text; offset: number }> = []
  let lastEligible: Text | null = null

  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text) || listenIneligibleText(node, container)) {
      node = walker.nextNode()
      continue
    }
    const textNode = node
    lastEligible = textNode
    const len = textNode.length
    for (let offset = 0; offset <= len; offset += 1) {
      if (running + offset === targetOffset) {
        matches.push({ node: textNode, offset })
      }
    }
    running += len
    node = walker.nextNode()
  }

  if (matches.length > 0) {
    matches.sort(sortCollapsedTextBoundariesDocumentOrder)
    const first = matches[0]!
    const last = matches[matches.length - 1]!
    if (first.node === last.node && first.offset === last.offset) return first
    if (hasGospelMountIntersectingOpenRangeBetween(container, first, last)) return first
    return last
  }

  if (lastEligible) {
    const len = lastEligible.length
    return { node: lastEligible, offset: len }
  }
  return null
}

export function visibleListenTextLengthBeforeBoundary(
  scope: HTMLElement,
  boundaryNode: Node,
  boundaryOffset: number
): number {
  const doc = scope.ownerDocument
  if (!doc) return 0

  const boundary = doc.createRange()
  boundary.setStart(boundaryNode, boundaryOffset)
  boundary.collapse(true)

  let count = 0
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text)) continue
    if (listenIneligibleText(step, scope)) continue
    const t = step
    const len = t.length
    for (let i = 0; i < len; i++) {
      const startOfChar = doc.createRange()
      startOfChar.setStart(t, i)
      startOfChar.collapse(true)
      const cmp = boundary.compareBoundaryPoints(Range.START_TO_START, startOfChar)
      if (cmp > 0) count++
      else return count
    }
  }
  return count
}

function nextEligibleListenTextNodeAfter(scope: HTMLElement, prev: Text): Text | null {
  const doc = scope.ownerDocument
  if (!doc) return null

  let seenPrev = false
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text) || listenIneligibleText(step, scope)) continue
    if (seenPrev) return step
    if (step === prev) seenPrev = true
  }
  return null
}

export function preferLaterEquivalentListenTextBoundary(
  scope: HTMLElement,
  point: { node: Text; offset: number }
): { node: Text; offset: number } {
  let cur = point
  const vbGoal = visibleListenTextLengthBeforeBoundary(scope, cur.node, cur.offset)

  let guard = 0
  while (guard++ < 512) {
    if (cur.offset !== cur.node.length) break
    const nx = nextEligibleListenTextNodeAfter(scope, cur.node)
    if (!nx) break
    if (visibleListenTextLengthBeforeBoundary(scope, nx, 0) !== vbGoal) break
    cur = { node: nx, offset: 0 }
  }

  return cur
}

function nextEligibleTextNodeAfter(scope: HTMLElement, prev: Text): Text | null {
  const doc = scope.ownerDocument
  if (!doc) return null

  let seenPrev = false
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let step: Node | null
  while ((step = walker.nextNode())) {
    if (!(step instanceof Text) || isWithinGospelMount(step, scope)) continue
    if (seenPrev) return step
    if (step === prev) seenPrev = true
  }
  return null
}

/**
 * When multiple collapsed DOM boundaries share the same visible offset (often at a decorative
 * 1‑character `<span>...</span>` before sibling text), the leftmost walker hit can confuse
 * wrapping / layout. Bump the boundary forward along equivalent collapsed points later in DOM order.
 */
export function preferLaterEquivalentTextBoundary(
  scope: HTMLElement,
  point: { node: Text; offset: number }
): { node: Text; offset: number } {
  let cur = point
  const vbGoal = visibleTextLengthBeforeBoundary(scope, cur.node, cur.offset)

  let guard = 0
  while (guard++ < 512) {
    if (cur.offset !== cur.node.length) break
    const nx = nextEligibleTextNodeAfter(scope, cur.node)
    if (!nx) break
    if (visibleTextLengthBeforeBoundary(scope, nx, 0) !== vbGoal) break
    cur = { node: nx, offset: 0 }
  }

  return cur
}

/**
 * Strip angle-bracket markup and decode common entities for highlight **list UI** and storage
 * normalization when a stored `quote` / label accidentally contains HTML fragments (legacy data
 * or odd selection serialization).
 */
export function plainTextForProfileHighlightUi(raw: string): string {
  const noTags = raw.replace(/<[^>]+>/g, ' ')
  if (typeof document === 'undefined') {
    return noTags.replace(/\s+/g, ' ').trim()
  }
  try {
    const t = document.createElement('textarea')
    t.innerHTML = noTags
    return (t.value || noTags).replace(/\s+/g, ' ').trim()
  } catch {
    return noTags.replace(/\s+/g, ' ').trim()
  }
}
