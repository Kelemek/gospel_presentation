/**
 * Plain text for profile body read-aloud (Web Speech). Omits COMA / Four Rules mount UI, most
 * **`<button>`** text (verse-pin chrome), and optionally **`h1`–`h6`** on Spurgeon sermon profiles
 * ({@link ProfileListenTextOptions.omitHeadingText}). **Scripture** is included: inline
 * `data-gospel-mount="scripture"` labels and **`data-tour="scripture-card"`** verse cards speak the
 * visible reference.
 *
 * Built from the same eligible Text-node walk used to map spoken character offsets back into
 * the DOM — avoids innerText vs proportional-walker drift (especially WebKit) that makes the
 * underline creep ahead of audio. Block boundaries in raw text become a **single space** in the
 * collapsed string (same length budget as speech per character for read-along); pauses across
 * blocks are handled by **utterance gaps** in {@link splitListenRawIntoTtsChunksWithOffsets}.
 */
import {
  isListenPlainTextNodeExcluded,
  type ProfileListenTextOptions,
} from '@/lib/profileHighlightVisibleText'

export type { ProfileListenTextOptions }

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

/** Nearest block-level ancestor of a text position, capped at `scope` (matches listen implicit breaks). */
export function readAlongListenBlockAncestor(node: Node, scope: HTMLElement): HTMLElement {
  const el = node.nodeType === Node.TEXT_NODE ? (node as Text).parentElement : (node as Element | null)
  return listenBlockAncestor(el, scope)
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

function listenTextNodeIneligible(node: Text, root: HTMLElement, opts?: ProfileListenTextOptions): boolean {
  return isListenPlainTextNodeExcluded(node, root, opts)
}

export function visibleListenRawText(root: HTMLElement, opts?: ProfileListenTextOptions): string {
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
    if (listenTextNodeIneligible(node, root, opts)) {
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

/**
 * Collapsed listen plain: implicit `\n` boundaries in {@link visibleListenRawText} become a
 * **single space** (same as collapsing all whitespace) so read-along indices stay aligned with
 * how Web Speech advances through utterance text.
 */
export function listenCollapsedPlainFromRaw(raw: string): string {
  if (!raw) return ''
  return raw
    .split('\n')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

export function plainTextForProfileResourceListen(
  root: HTMLElement,
  opts?: ProfileListenTextOptions
): string {
  return listenCollapsedPlainFromRaw(visibleListenRawText(root, opts))
}

/**
 * Maps a code-unit index into {@link visibleListenRawText} to a `(Text, offset)` boundary.
 *
 * **Do not** pass this index to {@link locateListenVisibleTextOffset}: that function counts a flat
 * stream with **no** implicit `\n` between block-level siblings, so indices diverge from TTS /
 * {@link walkerOffsetForReadAlongPlainOffset} whenever paragraphs, list items, headings, etc. break
 * the DOM — the read-along underline then creeps to the wrong line on long sections.
 */
export function locateListenRawTextOffset(
  root: HTMLElement,
  rawTarget: number,
  opts?: ProfileListenTextOptions
): { node: Text; offset: number } | null {
  if (rawTarget < 0) return null

  let position = 0
  let prevEligible: Text | null = null
  let lastEligible: Text | null = null

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text)) {
      node = walker.nextNode()
      continue
    }
    if (listenTextNodeIneligible(node, root, opts)) {
      node = walker.nextNode()
      continue
    }

    if (prevEligible && listenNeedsImplicitBreak(prevEligible, node, root)) {
      if (rawTarget === position) {
        return { node, offset: 0 }
      }
      position += 1
    }

    const text = node.textContent ?? ''
    const len = text.length
    lastEligible = node

    if (len > 0 && rawTarget < position + len) {
      return { node, offset: rawTarget - position }
    }
    position += len
    prevEligible = node
    node = walker.nextNode()
  }

  if (lastEligible && rawTarget === position) {
    return { node: lastEligible, offset: lastEligible.length }
  }
  return null
}
