/**
 * `<mark>` only allows phrasing content. `Range.extractContents` + `insertNode` can produce
 * `<mark><p>…</p></mark>` which browsers keep but is invalid and breaks styling/layout.
 * Hoist the mark inside a single wrapped block: `<p><mark>…</mark></p>`.
 */

const MARK_MUST_NOT_WRAP = new Set([
  'P',
  'DIV',
  'BLOCKQUOTE',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'PRE',
  'FIGURE',
  'TABLE',
  'SECTION',
  'ARTICLE',
])

function isBlockLikeMarkChild(el: Element): boolean {
  return el instanceof HTMLElement && MARK_MUST_NOT_WRAP.has(el.tagName)
}

export function coerceHighlightMarkBlockChildren(mark: HTMLElement): void {
  for (let guard = 0; guard < 24; guard += 1) {
    const blockChildren = Array.from(mark.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement && isBlockLikeMarkChild(c)
    )
    if (blockChildren.length !== 1) return

    const block = blockChildren[0]!
    const outer = mark.parentNode
    if (!outer) return

    outer.insertBefore(block, mark)
    while (block.firstChild) {
      mark.appendChild(block.firstChild)
    }
    block.appendChild(mark)
  }
}
