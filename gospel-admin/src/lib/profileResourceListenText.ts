/**
 * Plain text for profile body read-aloud (Web Speech). Drops inline scripture / COMA /
 * Four Rules mounts (same exclusion idea as highlight offset streams) and removes buttons
 * so verse-pin controls are not spoken.
 *
 * Built from the same eligible Text-node walk used to map spoken character offsets back into
 * the DOM — avoids innerText vs proportional-walker drift (especially WebKit) that makes the
 * underline creep ahead of audio.
 */
import { isWithinButton, isWithinGospelMount } from '@/lib/profileHighlightVisibleText'

/** Approximate block containers where `innerText` inserts a break between siblings. */
const LISTEN_BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'BODY',
  'CAPTION',
  'CENTER',
  'COLGROUP',
  'DD',
  'DETAILS',
  'DIALOG',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HGROUP',
  'HR',
  'HTML',
  'LEGEND',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'SUMMARY',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

function listenBlockAncestor(el: Element | null, scope: HTMLElement): HTMLElement {
  let cur: Node | null = el
  while (cur && cur !== scope) {
    if (cur instanceof HTMLElement && LISTEN_BLOCK_TAGS.has(cur.tagName)) {
      return cur
    }
    cur = cur.parentNode
  }
  return scope
}

function listenHasBrOrHrBetween(prevText: Text, curText: Text): boolean {
  const doc = prevText.ownerDocument
  if (!doc) return false
  const r = doc.createRange()
  try {
    r.setStartAfter(prevText)
    r.setEndBefore(curText)
  } catch {
    return false
  }
  if (r.collapsed) return false
  try {
    const frag = r.cloneContents()
    return frag.querySelector('br,hr') != null
  } catch {
    return false
  }
}

function listenNeedsImplicitBreak(prevText: Text, curText: Text, scope: HTMLElement): boolean {
  const pb = listenBlockAncestor(prevText.parentElement, scope)
  const cb = listenBlockAncestor(curText.parentElement, scope)
  if (pb !== cb) return true
  return listenHasBrOrHrBetween(prevText, curText)
}

export function visibleListenRawText(root: HTMLElement): string {
  const doc = root.ownerDocument
  if (!doc) return ''
  let s = ''
  let prevEligible: Text | null = null
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text)) {
      node = walker.nextNode()
      continue
    }
    if (isWithinGospelMount(node, root) || isWithinButton(node, root)) {
      node = walker.nextNode()
      continue
    }
    if (prevEligible && listenNeedsImplicitBreak(prevEligible, node, root)) {
      s += '\n'
    }
    s += node.textContent ?? ''
    prevEligible = node
    node = walker.nextNode()
  }
  return s
}

export function plainTextForProfileResourceListen(root: HTMLElement): string {
  return visibleListenRawText(root).replace(/\s+/g, ' ').trim()
}
