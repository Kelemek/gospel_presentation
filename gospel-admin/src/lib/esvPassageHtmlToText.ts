import { wrapScriptureWordsOfChrist } from '@/lib/scriptureWordsOfChristMarkup'

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripAllHtmlTags(html: string): string {
  return decodeBasicHtmlEntities(html.replace(/<[^>]+>/g, ''))
}

function collapseInlineSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Convert one ESV passage HTML fragment to bracket-verse plain text with optional words-of-Christ markers.
 */
export function esvPassageHtmlToScriptureText(html: string): string {
  const withoutCopyright = html.replace(/<p[^>]*>\s*\([^<]*ESV[^<]*\)\s*<\/p>/gi, '')
  const paragraphMatches = withoutCopyright.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi)
  if (!paragraphMatches?.length) {
    return collapseInlineSpaces(processEsvParagraphInner(stripAllHtmlTags(withoutCopyright)))
  }

  const paragraphs = paragraphMatches
    .map((p) => {
      const inner = p.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>\s*$/i, '')
      return collapseInlineSpaces(processEsvParagraphInner(inner))
    })
    .filter(Boolean)

  return paragraphs.join('\n\n')
}

/** ESV chapter opens with `2:1` inside verse-num; bracket only the verse digit for the reader. */
function bracketVerseNumFromEsvBold(inner: string): string {
  const chapterVerse = inner.match(/^(\d{1,3})\s*(?:&nbsp;)?\s*:\s*(\d{1,3})\s*$/)
  if (chapterVerse) {
    return `[${chapterVerse[2]}] `
  }
  const verseOnly = inner.match(/^(\d{1,3})\s*$/)
  if (verseOnly) {
    return `[${verseOnly[1]}] `
  }
  return inner
}

function processEsvParagraphInner(innerHtml: string): string {
  let s = innerHtml
  s = s.replace(
    /<b[^>]*class="[^"]*(?:verse-num|chapter-num)[^"]*"[^>]*>([\s\S]*?)<\/b>/gi,
    (_match, inner: string) => {
      const normalized = decodeBasicHtmlEntities(inner).replace(/\s+/g, ' ').trim()
      return bracketVerseNumFromEsvBold(normalized)
    }
  )
  s = s.replace(
    /<span[^>]*class="[^"]*woc[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_match, content: string) => {
      const inner = stripAllHtmlTags(content)
      const versePrefix = inner.match(/^(\[\d{1,3}\]\s+)([\s\S]*)$/)
      if (versePrefix?.[2]) {
        return `${versePrefix[1]}${wrapScriptureWordsOfChrist(versePrefix[2].trim())}`
      }
      return wrapScriptureWordsOfChrist(inner)
    }
  )
  return normalizeEsvMisconvertedChapterVersePrefix(stripAllHtmlTags(s))
}

/**
 * Legacy rows: mis-converted ESV chapter openers (`[2] :1` or plain `5:1` from `chapter-num`).
 * When `chapter` is passed (e.g. 5 for Matthew 5), only rewrite `chapter:1` at the start.
 */
export function normalizeEsvMisconvertedChapterVersePrefix(
  text: string,
  chapter?: number | null
): string {
  let out = text.replace(/^\[(\d{1,3})\]\s*:(\d{1,3})\s+/, '[$2] ')
  if (chapter != null && Number.isFinite(chapter) && chapter > 0) {
    out = out.replace(new RegExp(`^${chapter}:(\\d{1,3})\\s+`), '[$1] ')
  } else {
    out = out.replace(/^(\d{1,3}):(\d{1,3})\s+/, '[$2] ')
  }
  return out
}
