import { normalizeEsvMisconvertedChapterVersePrefix } from '@/lib/esvPassageHtmlToText'
import {
  scripturePassagePlainText,
  stripScriptureCacheVersionPrefix,
  stripScriptureWordsOfChristMarkers,
  wrapScriptureWordsOfChrist,
} from '@/lib/scriptureWordsOfChristMarkup'

/**
 * Normalize API.Bible passage `content` into `[n] verse` chunks with paragraph breaks
 * so ScriptureModal's `processChapterText` can style verse numbers like ESV.
 *
 * Passage fetches use `content-type=json` (`para` nodes → `\n\n` between paragraphs).
 * Search snippets and legacy cached plain text still go through the string path.
 *
 * Strips occasional publisher markup leaked into plain text (e.g. `#— #` around an em dash).
 */

export type ApiBibleContentNode = {
  name?: string
  type?: string
  text?: string
  attrs?: Record<string, string | string[] | undefined>
  items?: ApiBibleContentNode[]
}

function isApiBibleContentTree(value: unknown): value is ApiBibleContentNode[] {
  return (
    Array.isArray(value) &&
    value.some(
      (node) =>
        node &&
        typeof node === 'object' &&
        (node as ApiBibleContentNode).name === 'para'
    )
  )
}

function appendApiBibleNodes(nodes: readonly ApiBibleContentNode[] | undefined, out: string[]): void {
  if (!nodes?.length) return
  for (const node of nodes) {
    if (node.type === 'text' && typeof node.text === 'string') {
      out.push(node.text)
      continue
    }
    if (node.name === 'verse') {
      const n = node.attrs?.number
      if (typeof n === 'string' && n.trim()) {
        out.push(`[${n.trim()}] `)
      }
      continue
    }
    if (node.name === 'char') {
      const style = node.attrs?.style
      const styleName = typeof style === 'string' ? style : Array.isArray(style) ? style[0] : ''
      if (styleName === 'wj') {
        const inner: string[] = []
        appendApiBibleNodes(node.items, inner)
        out.push(wrapScriptureWordsOfChrist(inner.join('')))
        continue
      }
    }
    if (node.name === 'note') {
      continue
    }
    if (node.items?.length) {
      appendApiBibleNodes(node.items, out)
    }
  }
}

function paragraphTextFromApiBibleNodes(nodes: readonly ApiBibleContentNode[] | undefined): string {
  const parts: string[] = []
  appendApiBibleNodes(nodes, parts)
  return finishApiBiblePassageText(parts.join(''))
}

/** Format API.Bible `content-type=json` passage trees into bracket-verse plain text. */
export function formatApiBibleJsonPassageContent(root: readonly ApiBibleContentNode[]): string {
  const paragraphs: string[] = []
  for (const node of root) {
    if (node.name === 'para' && node.items?.length) {
      const para = paragraphTextFromApiBibleNodes(node.items)
      if (para) paragraphs.push(para)
      continue
    }
    const chunk = paragraphTextFromApiBibleNodes([node])
    if (chunk) paragraphs.push(chunk)
  }
  return paragraphs.join('\n\n')
}

function formatVersesArrayJson(
  verses: Array<{ verse?: number; number?: number; text?: string }>
): string {
  return finishApiBiblePassageText(
    verses
      .map((v) => {
        const n = v.verse ?? v.number
        const text = (v.text ?? '').trim()
        if (n == null) return text
        return `[${n}] ${text}`
      })
      .filter(Boolean)
      .join(' ')
  )
}

function formatApiBiblePassageTextFromString(raw: string): string {
  const t = raw.trim().replace(/\r\n/g, '\n')
  if (!t) return t

  if (/\[\d+\]/.test(t)) {
    return finishApiBiblePassageText(t)
  }

  try {
    const parsed = JSON.parse(t) as unknown
    if (isApiBibleContentTree(parsed)) {
      return formatApiBibleJsonPassageContent(parsed)
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { verses?: unknown }).verses)) {
      const verses = (parsed as { verses: Array<{ verse?: number; number?: number; text?: string }> })
        .verses
      return formatVersesArrayJson(verses)
    }
  } catch {
    /* not JSON */
  }

  const lines = t.split(/\n/)
  const parts: string[] = []
  for (const line of lines) {
    const m = line.match(/^\s*(\d{1,3})\s+(.+)$/)
    if (m) {
      parts.push(`[${m[1]}] ${m[2].trim()}`)
    } else if (line.trim()) {
      parts.push(line.trim())
    }
  }
  if (parts.length > 0) {
    return finishApiBiblePassageText(parts.join(' '))
  }

  return finishApiBiblePassageText(t)
}

/** Normalize API.Bible passage `content` (JSON tree or legacy plain text). */
export function formatApiBiblePassageContent(
  raw: string | readonly ApiBibleContentNode[]
): string {
  if (typeof raw === 'string') {
    return formatApiBiblePassageTextFromString(raw)
  }
  return formatApiBibleJsonPassageContent(raw)
}

/** String-only entry point (e.g. Bible search snippets and legacy cached plain text). */
export function formatApiBiblePassageText(raw: string): string {
  return formatApiBiblePassageContent(raw)
}

/** Em/en dash only — avoids touching hyphenated words. */
function stripHashWrappedDashes(s: string): string {
  return s.replace(/#\s*([\u2014\u2013])\s*#/g, '$1')
}

function stripPilcrowParagraphMarks(s: string): string {
  return s.replace(/\u00B6/g, '')
}

function finishApiBiblePassageText(s: string): string {
  return collapseWhitespace(stripHashWrappedDashes(stripPilcrowParagraphMarks(s)))
}

/**
 * Re-run {@link finishApiBiblePassageText} on plain `scripture_cache.text` so older rows pick up
 * plain-text fixes without waiting for TTL (strips legacy version line / inline markers if present).
 */
export function normalizeScriptureCachedText(text: string): string {
  return scripturePlainTextFromCacheRow(text)
}

/** Plain passage body for `scripture_cache.text` (legacy poisoned rows are cleaned on read). */
export function scripturePlainTextFromCacheRow(text: string): string {
  return finishApiBiblePassageText(
    normalizeEsvMisconvertedChapterVersePrefix(scripturePassagePlainText(text))
  )
}

/** Marked passage from `scripture_cache.woc_text` when present. */
export function scriptureWordsOfChristTextFromCacheRow(wocText: string | null | undefined): string | null {
  if (wocText == null || !wocText.trim()) return null
  return finishApiBiblePassageText(wocText)
}

/** Split a freshly fetched passage (with inline markers) into DB columns. */
export function splitScripturePassageForCacheStorage(markedPassage: string): {
  text: string
  woc_text: string
} {
  const body = stripScriptureCacheVersionPrefix(markedPassage.trimStart())
  const woc_text = finishApiBiblePassageText(body)
  const text = finishApiBiblePassageText(stripScriptureWordsOfChristMarkers(body))
  return { text, woc_text }
}

export type ScriptureCacheRow = {
  text: string
  woc_text?: string | null
}

/** Normalize legacy `scripture_cache.text` for storage when it still embeds markers or ESV chapter openers. */
export function healScriptureCacheRowIfNeeded(row: ScriptureCacheRow): {
  row: ScriptureCacheRow
  textChanged: boolean
} {
  const healedText = scripturePlainTextFromCacheRow(row.text)
  if (healedText === row.text) {
    return { row, textChanged: false }
  }
  return { row: { ...row, text: healedText }, textChanged: true }
}

export type ScriptureGetJsonBody = {
  reference: string
  text: string
  translation: string
  cached: boolean
  wordsOfChristText?: string
}

/** Build `GET /api/scripture` JSON; `text` is always plain for legacy clients. */
export function buildScriptureGetJsonBody(
  reference: string,
  translation: string,
  cached: boolean,
  row: ScriptureCacheRow,
  options: { includeWordsOfChristMarkup: boolean }
): ScriptureGetJsonBody {
  const text = scripturePlainTextFromCacheRow(row.text)
  const wordsOfChristText = scriptureWordsOfChristTextFromCacheRow(row.woc_text)
  const body: ScriptureGetJsonBody = {
    reference,
    text,
    translation,
    cached,
  }
  if (options.includeWordsOfChristMarkup && wordsOfChristText) {
    body.wordsOfChristText = wordsOfChristText
  }
  return body
}

/** Collapse whitespace within each paragraph; keep blank-line breaks for ESV paragraph layout. */
function collapseWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}
