import type { BibleTranslation } from '@/lib/bible-translations'
import { isApiBibleTranslation } from '@/lib/bible-translations'

/**
 * Lines that look like verse text (not section headings / titles API.Bible may insert).
 * Matches `[12]` markers or a line-leading verse number followed by text.
 */
function isVerseContentLine(trimmed: string): boolean {
  if (!trimmed) return false
  if (/^\[\d+\]/.test(trimmed)) return true
  return /^\d{1,3}\s+\S/.test(trimmed)
}

/**
 * Drop standalone heading/title lines when passage text mixes verses with plain lines
 * (API.Bible `content-type=text` can include section headings between verses).
 */
function keepOnlyVerseLines(t: string): string {
  const lines = t.split(/\n/)
  const kept: string[] = []
  for (const line of lines) {
    const s = line.trim()
    if (isVerseContentLine(s)) kept.push(s)
  }
  return kept.join(' ')
}

/**
 * CSB / NIV-style **inline** section titles on the same line as the verse number, e.g.
 * `[17] Cult Prostitution Forbidden. No Israelite…` or `Forbidden \u201cNo Israelite…`
 * (publisher title then verse, sometimes with a trailing ` Book 1:2` citation). Strip the
 * title when it looks like a heading (short, no finite verb) and the rest looks like verse.
 */
const LIKELY_VERSE_OR_NARRATIVE_RE =
  /\b(is|are|was|were|shall|will|must|may|should|can|could|did|do|does|have|has|had|been|being|spoke|said|says|told|gave|came|went|made|created|called|saw|heard|loved|knew|thought|answered|commanded|declared|sent|brought|took|wrote|read|walked|stood|sat|died|lived|left|found|turned|returned|remained|continued|began|ended|placed|put|set|opened|closed|filled|passed|showed|redeemed|saved|judged|blessed|cursed|warned|promised|swore|remembered|forgot|come|go|make|see|hear|know|think|answer|command|declare|send|bring|take|write|walk|stand|sit|die|live|leave|find|turn|return|remain|continue|begin|end|place|open|close|fill|pass|show|redeem|save|judge|bless|curse|warn|promise|swear|remember|forget)\b/i

/** Trailing citation API.Bible sometimes appends, e.g. ` Deuteronomy 23:17` or ` 1 John 3:16`. */
function stripTrailingPassageReference(body: string): string {
  return body
    .replace(/\s+(?:\d+\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d+:\d+(?:-\d+)?\s*$/u, '')
    .trimEnd()
}

/**
 * CSB-style inline title then opening quote before verse: `Cult Prostitution Forbidden "No Israelite…`
 * (no period between title and verse).
 */
function stripLeadingTitleBeforeQuotedVerse(body: string): string {
  const m = body.match(/^([^"'\u201c\u2018]+)["'\u201c\u2018]([\s\S]+)$/)
  if (!m) return body

  const title = m[1].trim()
  const verse = m[2].trim()
  if (title.includes(',')) return body
  if (LIKELY_VERSE_OR_NARRATIVE_RE.test(title)) return body

  const words = title.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 16) return body
  if (verse.length < 8) return body

  return verse
}

function stripLeadingHeadingSentenceFromVerseBody(body: string): string {
  let trimmed = body.trim()
  trimmed = stripTrailingPassageReference(trimmed)
  trimmed = stripLeadingTitleBeforeQuotedVerse(trimmed)

  /* Verse is dialogue starting with a quote — do not strip a period-based “title.” */
  if (/^["'\u201c\u2018]/.test(trimmed)) return trimmed

  const m = trimmed.match(/^([\s\S]{5,160}?\.)\s+([\s\S]{8,})$/)
  if (!m) return trimmed

  const first = m[1]
  const rest = m[2]
  if (first.includes(',')) return trimmed
  if (LIKELY_VERSE_OR_NARRATIVE_RE.test(first)) return trimmed

  const words = first.replace(/\.$/, '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 16) return trimmed

  return stripTrailingPassageReference(rest)
}

function stripInlineSectionTitlesFromFormattedPassage(text: string): string {
  if (!text.trim()) return text
  const chunks = text.split(/(?=\[\d+\]\s)/g).filter((c) => c.length > 0)
  return chunks
    .map((chunk) => {
      const m = chunk.match(/^\[(\d+)\]\s*([\s\S]*)$/)
      if (!m) return stripLeadingHeadingSentenceFromVerseBody(chunk.trim())
      const b = stripLeadingHeadingSentenceFromVerseBody(m[2].trim())
      return `[${m[1]}] ${b}`
    })
    .join(' ')
}

/**
 * Normalize API.Bible passage `content` (text or JSON string) into `[n] verse` chunks
 * so ScriptureModal's `processChapterText` can style verse numbers like ESV.
 * Section headings are omitted so memorization and readers get verse text only.
 */
export function formatApiBiblePassageText(raw: string): string {
  let t = raw.trim().replace(/\r\n/g, '\n')
  if (!t) return t

  let result: string

  if (/\[\d+\]/.test(t)) {
    const joined = keepOnlyVerseLines(t)
    /* If `[n]` exists in the string but not at line starts (or only inline), keep full text. */
    result = joined.trim() ? collapseWhitespace(joined) : collapseWhitespace(t)
  } else {
    try {
      const parsed = JSON.parse(t) as unknown
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { verses?: unknown }).verses)) {
        const verses = (parsed as { verses: Array<{ verse?: number; number?: number; text?: string }> }).verses
        result = verses
          .map((v) => {
            const n = v.verse ?? v.number
            const text = (v.text ?? '').trim()
            if (n == null) return text
            return `[${n}] ${text}`
          })
          .filter(Boolean)
          .join(' ')
      } else {
        result = ''
      }
    } catch {
      result = ''
    }

    if (!result) {
      const lines = t.split(/\n/)
      const parts: string[] = []
      for (const line of lines) {
        const m = line.match(/^\s*(\d{1,3})\s+(.+)$/)
        if (m) {
          parts.push(`[${m[1]}] ${m[2].trim()}`)
        }
        /* skip non-verse lines (e.g. section headings) */
      }
      if (parts.length > 0) {
        result = collapseWhitespace(parts.join(' '))
      } else {
        result = collapseWhitespace(keepOnlyVerseLines(t))
      }
    }
  }

  /* Legacy / multi-line shapes with headings + quoted verse but no `[n]` lines drop to empty via
   * keepOnlyVerseLines — recover by stripping titles/citations from the full passage as one blob. */
  if (!result.trim()) {
    const collapsed = collapseWhitespace(t)
    if (collapsed) {
      const recovered = stripLeadingHeadingSentenceFromVerseBody(collapsed)
      if (recovered.trim()) result = recovered
    }
  }

  return stripInlineSectionTitlesFromFormattedPassage(result)
}

/**
 * Re-run {@link formatApiBiblePassageText} for API.Bible-backed translations when text was
 * stored earlier (scripture_cache, local memorization) so heading-stripping fixes apply without
 * clearing caches.
 */
export function normalizeApiBibleStoredText(translation: BibleTranslation, text: string): string {
  if (!isApiBibleTranslation(translation)) return text
  const formatted = formatApiBiblePassageText(text)
  /* Never drop to empty memorization/reader text if the source had content (formatter edge case). */
  if (formatted.trim()) return formatted
  return text.trim()
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
