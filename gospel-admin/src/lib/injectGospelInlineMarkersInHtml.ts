import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'

export type GospelInlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'coma'; label: string }
  | { kind: 'fourRules' }
  /** cleanRef is normalized for display; rawLength is match length in the flattened string (DOM range). */
  | { kind: 'scripture'; cleanRef: string; rawLength: number }

const COMA_RE = /(C\.O\.M\.A\.|COMA)/gi
const FOUR_RULES_PHRASE = 'Four Rules of Communication'

/** Insert display space when rich text removed a gap (e.g. `Acts` + `26` → `Acts26`). */
function normalizeScriptureDisplay(ref: string): string {
  return ref
    .replace(/\s+/g, ' ')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Flattened-text scripture pattern. Uses `\s*` before chapter so `Acts26:15` still matches
 * when TipTap splits bold across tags with no whitespace between book and digits.
 */
function buildScripturePlainTextRegex(): RegExp {
  const word = '[A-Z][a-z]+'
  const ws = '\\s+'
  const leadingNum = '(?:\\d+\\s*)?'
  return new RegExp(
    `\\b(${leadingNum}${word}(?:${ws}(?:of|and|the)${ws}${word})*)\\s*(\\d+):(\\d+)(?:-\\d+)?(?:,\\s*\\d+(?::\\d+)?)*\\b`,
    'gi'
  )
}

const SCRIPTURE_PLAIN_RE = buildScripturePlainTextRegex()

function splitComaInText(value: string): GospelInlineSegment[] {
  const out: GospelInlineSegment[] = []
  let last = 0
  COMA_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = COMA_RE.exec(value)) !== null) {
    if (m.index > last) out.push({ kind: 'text', value: value.slice(last, m.index) })
    out.push({ kind: 'coma', label: m[0] })
    last = m.index + m[0].length
  }
  if (last < value.length) out.push({ kind: 'text', value: value.slice(last) })
  if (out.length === 0 && value.length > 0) out.push({ kind: 'text', value })
  return out
}

function splitFourRulesInText(value: string): GospelInlineSegment[] {
  const out: GospelInlineSegment[] = []
  const escaped = FOUR_RULES_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'g')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) out.push({ kind: 'text', value: value.slice(last, m.index) })
    out.push({ kind: 'fourRules' })
    last = m.index + m[0].length
  }
  if (last < value.length) out.push({ kind: 'text', value: value.slice(last) })
  if (out.length === 0 && value.length > 0) out.push({ kind: 'text', value })
  return out
}

function splitScriptureInText(value: string): GospelInlineSegment[] {
  const out: GospelInlineSegment[] = []
  let last = 0
  SCRIPTURE_PLAIN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SCRIPTURE_PLAIN_RE.exec(value)) !== null) {
    if (m.index > last) out.push({ kind: 'text', value: value.slice(last, m.index) })

    const bookName = m[1].replace(/\s+/g, ' ').trim()
    if (!GOSPEL_BIBLE_BOOK_NAMES.has(bookName)) {
      SCRIPTURE_PLAIN_RE.lastIndex = m.index + 1
      continue
    }

    const cleanRef = normalizeScriptureDisplay(m[0])
    out.push({ kind: 'scripture', cleanRef, rawLength: m[0].length })
    last = m.index + m[0].length
    SCRIPTURE_PLAIN_RE.lastIndex = last
  }
  if (last < value.length) out.push({ kind: 'text', value: value.slice(last) })
  if (out.length === 0 && value.length > 0) out.push({ kind: 'text', value })
  return out
}

function flattenTextChunks(
  chunks: GospelInlineSegment[],
  splitter: (t: string) => GospelInlineSegment[]
): GospelInlineSegment[] {
  return chunks.flatMap((c) => (c.kind === 'text' ? splitter(c.value) : [c]))
}

/** Split plain text into COMA / Four Rules / scripture segments (order matches legacy string replace). */
export function segmentPlainTextForGospelInlines(text: string): GospelInlineSegment[] {
  let chunks: GospelInlineSegment[] = [{ kind: 'text', value: text }]
  chunks = flattenTextChunks(chunks, splitComaInText)
  chunks = flattenTextChunks(chunks, splitFourRulesInText)
  chunks = flattenTextChunks(chunks, splitScriptureInText)
  return chunks
}

function shouldSkipTextNodeParent(textNode: Text): boolean {
  let el: Element | null = textNode.parentElement
  while (el) {
    const tag = el.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return true
    el = el.parentElement
  }
  return false
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

type NonTextRange =
  | { start: number; end: number; kind: 'coma'; label: string }
  | { start: number; end: number; kind: 'fourRules' }
  | { start: number; end: number; kind: 'scripture'; cleanRef: string }

function segmentsToNonTextRanges(segments: GospelInlineSegment[]): NonTextRange[] {
  let pos = 0
  const out: NonTextRange[] = []
  for (const s of segments) {
    if (s.kind === 'text') {
      pos += s.value.length
    } else if (s.kind === 'coma') {
      out.push({ start: pos, end: pos + s.label.length, kind: 'coma', label: s.label })
      pos += s.label.length
    } else if (s.kind === 'fourRules') {
      out.push({ start: pos, end: pos + FOUR_RULES_PHRASE.length, kind: 'fourRules' })
      pos += FOUR_RULES_PHRASE.length
    } else {
      out.push({ start: pos, end: pos + s.rawLength, kind: 'scripture', cleanRef: s.cleanRef })
      pos += s.rawLength
    }
  }
  return out
}

/** Concatenated text under `root` in document order (same basis as segment offsets). */
function collectFlatTextUnder(root: Element, doc: Document): string {
  let s = ''
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (shouldSkipTextNodeParent(t)) continue
    s += t.data
  }
  return s
}

/**
 * DOM boundary immediately before the character at flat index `globalOffset`
 * (or end of all text when globalOffset === total length).
 */
function findBoundaryBefore(
  root: Element,
  doc: Document,
  globalOffset: number
): { node: Text; offset: number } | null {
  if (globalOffset < 0) return null
  let seen = 0
  let lastText: Text | null = null
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (shouldSkipTextNodeParent(t)) continue
    lastText = t
    const len = t.data.length
    if (globalOffset < seen + len) {
      return { node: t, offset: globalOffset - seen }
    }
    if (globalOffset === seen + len) {
      return { node: t, offset: len }
    }
    seen += len
  }
  if (lastText && globalOffset === seen) {
    return { node: lastText, offset: lastText.length }
  }
  return null
}

function directChildTag(el: Element, tagLower: string): boolean {
  for (let i = 0; i < el.children.length; i++) {
    if (el.children[i].tagName.toLowerCase() === tagLower) return true
  }
  return false
}

/** Block-ish roots where TipTap keeps phrasing (refs may span inline tags like strong). */
function queryBlockTargets(host: Element): Element[] {
  const set = new Set<Element>()
  for (const sel of ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'blockquote'] as const) {
    host.querySelectorAll(sel).forEach((el) => set.add(el))
  }
  host.querySelectorAll('li').forEach((li) => {
    // Task items are `li > label + div > p`; never treat the whole `li` as a text block.
    if (li.getAttribute('data-type') === 'taskItem') return
    if (!directChildTag(li, 'p')) set.add(li)
  })
  // Plain `<div>Acts 1:1</div>` (no `<p>`) — still one phrasing block.
  if (set.size === 0 && host.children.length === 1) {
    const sole = host.children[0]
    const t = sole.tagName.toLowerCase()
    if (t === 'div' || t === 'article' || t === 'section') set.add(sole)
  }
  return [...set]
}

function createMountSpan(doc: Document, r: NonTextRange): HTMLSpanElement {
  const span = doc.createElement('span')
  if (r.kind === 'coma') {
    span.setAttribute('data-gospel-mount', 'coma')
    span.setAttribute('data-gospel-coma-label', escapeAttr(r.label))
  } else if (r.kind === 'fourRules') {
    span.setAttribute('data-gospel-mount', 'fourRules')
  } else {
    span.setAttribute('data-gospel-mount', 'scripture')
    span.setAttribute('data-gospel-ref', escapeAttr(r.cleanRef))
  }
  return span
}

function applyNonTextRange(root: Element, doc: Document, r: NonTextRange): void {
  const startB = findBoundaryBefore(root, doc, r.start)
  const endB = findBoundaryBefore(root, doc, r.end)
  if (!startB || !endB) return
  try {
    const range = doc.createRange()
    range.setStart(startB.node, startB.offset)
    range.setEnd(endB.node, endB.offset)
    range.deleteContents()
    range.insertNode(createMountSpan(doc, r))
  } catch {
    /* detached / invalid range */
  }
}

function injectIntoBlockRoot(el: Element, doc: Document): void {
  if (el.closest('script, style, pre, code')) return

  const flat = collectFlatTextUnder(el, doc)
  if (!flat.length) return

  const segments = segmentPlainTextForGospelInlines(flat)
  if (segments.length === 1 && segments[0].kind === 'text' && segments[0].value === flat) {
    return
  }

  const ranges = segmentsToNonTextRanges(segments)
  if (!ranges.length) return

  ranges.sort((a, b) => b.start - a.start)
  for (const r of ranges) {
    applyNonTextRange(el, doc, r)
  }
}

/**
 * Injects COMA / Four Rules / scripture mount spans using **block-level** flattened text
 * and DOM Ranges so references still match when TipTap splits them across inline tags
 * (e.g. `<strong>Acts</strong> 26:15-18`).
 */
export function injectGospelInlineMarkersInHtml(html: string, doc?: Document): string {
  const d = doc ?? (typeof document !== 'undefined' ? document : undefined)
  if (!d || !html) return html

  const host = d.createElement('div')
  host.innerHTML = html

  const targets = queryBlockTargets(host)
  for (const block of targets) {
    injectIntoBlockRoot(block, d)
  }

  // Plain string or inline-only fragment (no p/li/heading/table) — e.g. tests and short answers.
  if (targets.length === 0 && (host.textContent?.length ?? 0) > 0) {
    injectIntoBlockRoot(host, d)
  }

  return host.innerHTML
}
