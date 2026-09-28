/**
 * Inline markers for words of Christ in passage text (API `wordsOfChristText` / `woc_text` column).
 * `scripture_cache.text` stays plain; legacy rows may still embed a version line or markers in `text`.
 */

/** Legacy cache version line (no longer written; stripped when reading old `text` rows). */
export const SCRIPTURE_CACHE_VERSION_LINE = '@gp:scripture-cache:v2'

/** Private-use delimiters (not spoken, stripped for share/memorization). */
export const SCRIPTURE_WOC_START = '\uE000'
export const SCRIPTURE_WOC_END = '\uE001'

/** Blank line after the version line so whitespace normalization cannot glue it to verse 1. */
const VERSION_PREFIX = `${SCRIPTURE_CACHE_VERSION_LINE}\n\n`

export function hasScriptureCacheVersion(text: string): boolean {
  return text.startsWith(VERSION_PREFIX)
}

export function stripScriptureCacheVersionPrefix(text: string): string {
  if (text.startsWith(VERSION_PREFIX)) {
    return text.slice(VERSION_PREFIX.length)
  }
  if (text.startsWith(`${SCRIPTURE_CACHE_VERSION_LINE}\n`)) {
    return text.slice(SCRIPTURE_CACHE_VERSION_LINE.length + 1)
  }
  if (text.startsWith(SCRIPTURE_CACHE_VERSION_LINE)) {
    return text.slice(SCRIPTURE_CACHE_VERSION_LINE.length).replace(/^\s+/, '')
  }
  return text
}

export function prefixScriptureCacheText(passageText: string): string {
  const body = passageText.trimStart()
  if (body.startsWith(SCRIPTURE_CACHE_VERSION_LINE)) {
    return passageText
  }
  return `${VERSION_PREFIX}${body}`
}

/** Remove words-of-Christ markers for plain-text consumers (share, memorization, hover). */
export function stripScriptureWordsOfChristMarkers(text: string): string {
  return text
    .replaceAll(SCRIPTURE_WOC_START, '')
    .replaceAll(SCRIPTURE_WOC_END, '')
}

/** Cache version prefix + marker strip for display outside the scripture reader HTML pipeline. */
export function scripturePassagePlainText(text: string): string {
  return stripScriptureWordsOfChristMarkers(stripScriptureCacheVersionPrefix(text))
}

export function wrapScriptureWordsOfChrist(inner: string): string {
  if (!inner) return ''
  return `${SCRIPTURE_WOC_START}${inner}${SCRIPTURE_WOC_END}`
}

/** Keep `[n]` verse markers outside WOC delimiters so chapter HTML can wrap verses in block highlights. */
export function ensureVerseNumbersOutsideWordsOfChrist(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const start = text.indexOf(SCRIPTURE_WOC_START, i)
    if (start === -1) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, start)
    const end = text.indexOf(SCRIPTURE_WOC_END, start + SCRIPTURE_WOC_START.length)
    if (end === -1) {
      out += text.slice(start)
      break
    }
    const inner = text.slice(start + SCRIPTURE_WOC_START.length, end)
    const versePrefix = inner.match(/^(\[\d{1,3}\]\s+)([\s\S]*)$/)
    if (versePrefix?.[2]) {
      out += `${versePrefix[1]}${SCRIPTURE_WOC_START}${versePrefix[2]}${SCRIPTURE_WOC_END}`
    } else {
      out += `${SCRIPTURE_WOC_START}${inner}${SCRIPTURE_WOC_END}`
    }
    i = end + SCRIPTURE_WOC_END.length
  }
  return out
}

/** `true` when the request wants inline words-of-Christ markers in passage `text`. */
export function parseScriptureWocMarkupRequestParam(value: string | null): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}
