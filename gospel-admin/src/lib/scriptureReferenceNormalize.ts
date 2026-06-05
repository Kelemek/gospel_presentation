import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'
import { parseReference } from '@/lib/parse-scripture-reference'
import {
  normalizeThmlPeriodVerseSeparators,
  normalizedPassageDisplayForInline,
} from '@/lib/spurgeon/ccelSermonHtml'
import type {
  GospelPresentationData,
  GospelSection,
  NestedSubsection,
  QuestionAnswer,
  ScriptureReference,
  Subsection,
} from '@/lib/types'

/**
 * Same shape as {@link injectGospelInlineMarkersInHtml} plain-text scripture matcher.
 * Optional period after book (`Prov. 30:4`, `I Cor. 1:28`) — common in CCEL prose.
 */
export function buildScripturePlainTextRegex(): RegExp {
  const word = '[A-Z][a-z]+'
  const ws = '\\s+'
  const leadingNum = '(?:\\d+\\s*)?'
  /** CCEL prose: `I Cor.`, `II Pet.` (not matched by digit-only leadingNum). */
  const leadingRoman = '(?:I{1,3}\\s+)?'
  /** CCEL prose: `1:16f.` or `21:4f` (verse and following). */
  const followingVerses = '(?:(?:ff\\.|f\\.)|(?:ff|f)(?=\\s|,|;|"|$))?'
  const verseTail = `(?:\\s*:\\s*(\\d+)${followingVerses}(?:\\s*-\\s*\\d+)?(?:,\\s*\\d+(?::\\s*\\d+)?)*)?`
  /** CCEL typo: `R Revelation 4:4` / `J John 12:25` (abbrev letter left before full book). */
  const orphanAbbrevLetter = '(?:[A-Z]\\.?\\s+)?'
  /** Avoid `Isaiah 1 Thessalonians` matching as Isaiah ch.1 when a numbered book follows. */
  const chapterNotBeforeAnotherBook = '(?!\\s+[A-Z][a-z]+)'
  return new RegExp(
    `\\b${orphanAbbrevLetter}(${leadingNum}${leadingRoman}${word}(?:${ws}(?:of|and|the)${ws}${word})*)\\s*\\.?\\s*(\\d+)${chapterNotBeforeAnotherBook}${verseTail}(?=$|[^\\w:])`,
    'gi'
  )
}

/** `1:16f.` / `1:16ff` → `1:16` for canonical lookup and verse cards. */
export function stripFollowingVersesMarker(ref: string): string {
  return ref.replace(/(\d+):\s*(\d+)(?:f|ff)\.?$/i, '$1:$2')
}

/** Space before chapter:verse when CCEL omits it (`Phil.3:14`, `2 Cor.5:21`). */
export function normalizeScriptureDisplay(ref: string): string {
  return ref
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ':')
    .replace(/\.(\d)/g, '. $1')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** CCEL prose after a full ref: `; 50:1-3` or `; 18:30; 24:30` (no repeated book). */
const BARE_SEMICOLON_CHAPTER_VERSE_RE =
  /^[\s]*[;,][\s]*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?(?=[\s;,;.)\]"']|$)/

/** After a chapter-only ref: `1 Corinthians 15; 16` → `1 Corinthians 16`. */
const BARE_SEMICOLON_CHAPTER_ONLY_RE =
  /^[\s]*[;,][\s]*(\d+)(?!\s*:|\s*[A-Za-z])(?=[\s;,;.)\]"']|$)/

const SEMICOLON_BOOK_FRAGMENT_WORD =
  '[A-Z][a-z]+(?:\\s+(?:of|and|the)\\s+[A-Z][a-z]+)*'

/** `1 Thess 4:16; Thessalonians 4:16-17` — book name repeated without leading number. */
const BARE_SEMICOLON_NAMED_BOOK_RE = new RegExp(
  `^[\\s]*[;,][\\s]*(${SEMICOLON_BOOK_FRAGMENT_WORD})\\s*\\.?\\s*(\\d+)` +
    `(?:\\s*:\\s*(\\d+)(?:\\s*-\\s*(\\d+))?(?:,\\s*\\d+(?::\\s*\\d+)?)*)?` +
    `(?!\\s+[A-Z][a-z]+)` +
    `(?=[\\s;,;.)\\]"\\']|$)`,
  'i'
)

export type ScripturePlainSpan = { start: number; end: number; raw: string; cleanRef: string }

function resolveSemicolonInheritedBookName(priorCanonicalBook: string, bookFragment: string): string | null {
  const frag = bookFragment.trim().replace(/\s+/g, ' ')
  const prior = priorCanonicalBook.trim().replace(/\s+/g, ' ')
  if (prior === frag) return prior
  const numBook = /^(\d+)\s+(.+)$/.exec(prior)
  if (numBook && numBook[2] === frag) return prior
  return null
}

/** Parse one inherited `; ch:v` / `; ch` / `; Book ch:v` after a canonical ref (suffix must start at 0). */
function parseInheritedSemicolonRefAt(
  suffix: string,
  priorCanonicalBook: string
): { raw: string; cleanRef: string } | null {
  const verseM = BARE_SEMICOLON_CHAPTER_VERSE_RE.exec(suffix)
  if (verseM && (verseM.index ?? 0) === 0) {
    const chapter = verseM[1]
    const versePart = verseM[3] ? `${verseM[2]}-${verseM[3]}` : verseM[2]
    const raw = verseM[0]
    const cleanRef = normalizeScriptureReferenceString(`${priorCanonicalBook} ${chapter}:${versePart}`)
    if (!isGospelCanonicalScriptureRef(cleanRef)) return null
    return { raw, cleanRef }
  }
  const chapM = BARE_SEMICOLON_CHAPTER_ONLY_RE.exec(suffix)
  if (chapM && (chapM.index ?? 0) === 0) {
    const raw = chapM[0]
    const cleanRef = normalizeScriptureReferenceString(`${priorCanonicalBook} ${chapM[1]}`)
    if (!isGospelCanonicalScriptureRef(cleanRef)) return null
    return { raw, cleanRef }
  }
  const bookM = BARE_SEMICOLON_NAMED_BOOK_RE.exec(suffix)
  if (bookM && (bookM.index ?? 0) === 0) {
    const resolvedBook = resolveSemicolonInheritedBookName(priorCanonicalBook, bookM[1])
    if (!resolvedBook) return null
    const raw = bookM[0]
    let refBody = `${resolvedBook} ${bookM[2]}`
    if (bookM[3] != null) {
      refBody += bookM[4] ? `:${bookM[3]}-${bookM[4]}` : `:${bookM[3]}`
    }
    const cleanRef = normalizeScriptureReferenceString(refBody)
    if (!isGospelCanonicalScriptureRef(cleanRef)) return null
    return { raw, cleanRef }
  }
  return null
}

/**
 * Find scripture spans in plain text without mutating the string (safe for DOM offset mapping).
 * Handles semicolon book inheritance and orphan abbrev letters (`R Revelation`).
 */
export function scanCanonicalScriptureSpansInPlainText(text: string): ScripturePlainSpan[] {
  const norm = text.replace(/\u2013/g, '-').replace(/\u2014/g, '-')
  const spans: ScripturePlainSpan[] = []
  const re = buildScripturePlainTextRegex()
  let pos = 0
  while (pos < norm.length) {
    re.lastIndex = pos
    const m = re.exec(norm)
    if (!m) break
    if (m.index! > pos) {
      pos = m.index!
    }
    const raw = m[0]
    const cleanRef = normalizeScriptureReferenceString(raw)
    if (!isGospelCanonicalScriptureRef(cleanRef)) {
      pos = m.index! + 1
      continue
    }
    const start = m.index!
    spans.push({ start, end: start + raw.length, raw, cleanRef })
    let cursor = start + raw.length
    const priorBook = parseReference(cleanRef)?.book
    if (priorBook) {
      while (cursor < norm.length) {
        const inherited = parseInheritedSemicolonRefAt(norm.slice(cursor), priorBook)
        if (!inherited) break
        spans.push({
          start: cursor,
          end: cursor + inherited.raw.length,
          raw: inherited.raw,
          cleanRef: inherited.cleanRef,
        })
        cursor += inherited.raw.length
      }
    }
    pos = cursor
  }
  return spans
}

function expandBareSemicolonRefsInSuffix(
  suffix: string,
  canonicalBook: string
): { expanded: string; consumed: number } {
  let i = 0
  let expanded = ''
  while (i < suffix.length) {
    const rest = suffix.slice(i)
    const verseM = BARE_SEMICOLON_CHAPTER_VERSE_RE.exec(rest)
    if (verseM && (verseM.index ?? 0) === 0) {
      const lead = verseM[0].match(/^[\s]*[;,][\s]*/)?.[0] ?? ''
      const chapter = verseM[1]
      const versePart = verseM[3] ? `${verseM[2]}-${verseM[3]}` : verseM[2]
      expanded += lead + `${canonicalBook} ${chapter}:${versePart}`
      i += verseM[0].length
      continue
    }
    const chapM = BARE_SEMICOLON_CHAPTER_ONLY_RE.exec(rest)
    if (chapM && (chapM.index ?? 0) === 0) {
      const lead = chapM[0].match(/^[\s]*[;,][\s]*/)?.[0] ?? ''
      expanded += lead + `${canonicalBook} ${chapM[1]}`
      i += chapM[0].length
      continue
    }
    const bookM = BARE_SEMICOLON_NAMED_BOOK_RE.exec(rest)
    if (bookM && (bookM.index ?? 0) === 0) {
      const resolvedBook = resolveSemicolonInheritedBookName(canonicalBook, bookM[1])
      if (!resolvedBook) break
      const lead = bookM[0].match(/^[\s]*[;,][\s]*/)?.[0] ?? ''
      let refBody = `${resolvedBook} ${bookM[2]}`
      if (bookM[3] != null) {
        refBody += bookM[4] ? `:${bookM[3]}-${bookM[4]}` : `:${bookM[3]}`
      }
      const cleanRef = normalizeScriptureReferenceString(refBody)
      if (!isGospelCanonicalScriptureRef(cleanRef)) break
      expanded += lead + refBody
      i += bookM[0].length
      continue
    }
    break
  }
  if (i === 0) return { expanded: '', consumed: 0 }
  return { expanded, consumed: i }
}

/** One pass: after each canonical `Book ch:v`, expand following `; ch:v` chains to reuse that book. */
function expandSemicolonInheritedBookRefsOnce(text: string): string {
  const re = buildScripturePlainTextRegex()
  const patches: { start: number; end: number; replacement: string }[] = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const canonical = normalizeScriptureReferenceString(m[0])
    if (!isGospelCanonicalScriptureRef(canonical)) continue
    const book = parseReference(canonical)?.book
    if (!book) continue
    const afterStart = m.index! + m[0].length
    const { expanded, consumed } = expandBareSemicolonRefsInSuffix(text.slice(afterStart), book)
    if (consumed > 0) {
      patches.push({ start: afterStart, end: afterStart + consumed, replacement: expanded })
    }
  }
  if (patches.length === 0) return text
  patches.sort((a, b) => b.start - a.start)
  let out = text
  for (const p of patches) {
    out = out.slice(0, p.start) + p.replacement + out.slice(p.end)
  }
  return out
}

/**
 * Pilgrim's Progress / CCEL lists: `Psalms 5:4 ; 50:1-3` → `Psalms 5:4 ; Psalms 50:1-3`.
 * Repeats until stable so multiple chains in one paragraph are handled.
 */
export function expandSemicolonInheritedBookRefs(text: string): string {
  let s = text
  for (let i = 0; i < 8; i++) {
    const next = expandSemicolonInheritedBookRefsOnce(s)
    if (next === s) return s
    s = next
  }
  return s
}

/**
 * CCEL chained `scripRef` tags (common in Berkhof) expand to `Book 1:20,Book 1:21`.
 * Comma before another book token is not a same-chapter verse list — use semicolon.
 */
export function expandCommaBetweenDistinctScriptureRefs(text: string): string {
  return text.replace(/(\d+:\d+(?:-\d+)?),\s*(?=(?:\d+\s+)?[A-Za-z])/g, '$1; ')
}

/**
 * CCEL chained scripRef with verse-only tail (`2 Peter 2:4,9`) — range if contiguous, else semicolon.
 */
export function expandSameChapterCommaVerseOrSeparate(text: string): string {
  return text.replace(
    /(\b(?:\d+\s+)?(?:[A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)*)\s+\d+:\d+),(\d+)\b/g,
    (full, head, verseStr) => {
      const normHead = normalizeScriptureReferenceString(String(head))
      const ranged = commaVerseTailToRange(normHead, `,${verseStr}`)
      if (ranged) return ranged
      if (!isGospelCanonicalScriptureRef(normHead)) return full
      const parsed = parseReference(normHead)
      if (!parsed) return full
      const bookLabel = normHead.replace(/\s+\d+:\d+(?:-\d+)?$/, '').trim()
      return `${normHead}; ${bookLabel} ${parsed.chapter}:${verseStr}`
    }
  )
}

/** Unicode dashes → ASCII hyphen so verse ranges match in HTML and plain text. */
export function preprocessScriptureHtmlForNormalize(html: string): string {
  return expandSameChapterCommaVerseOrSeparate(
    expandCommaBetweenDistinctScriptureRefs(
      html
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-')
        /** CCEL Pilgrim typo: `Isaiah 6:2; Isaiah 1 Thessalonians 4:16` → `1 Thessalonians 4:16`. */
        .replace(/\bIsaiah\s+1\s+Thessalonians\b/gi, '1 Thessalonians')
        /** CCEL Berkhof typo: `11 Thess. 1:6` → `1 Thess. 1:6`. */
        .replace(/\b11\s+Thess\b/gi, '1 Thess')
        .replace(/\bSong of Sol\./gi, 'Song of Songs')
    )
  )
}

function gospelBookNamePrefixesCanonicalRef(norm: string): boolean {
  return [...GOSPEL_BIBLE_BOOK_NAMES].some((name) => norm.startsWith(`${name} `))
}

/** True when reference parses to a canonical Gospel book (verse or chapter-only verse-card shape). */
export function isGospelCanonicalScriptureRef(ref: string): boolean {
  const displayNorm = normalizeScriptureDisplay(ref.replace(/–/g, '-'))
  const withoutFollowing = stripFollowingVersesMarker(displayNorm)
  const commaTail = withoutFollowing.match(COMMA_VERSE_TAIL_RE)
  const head = commaTail ? commaTail[1] : withoutFollowing
  const norm = normalizedPassageDisplayForInline(head)
  const parsed = parseReference(norm)
  if (!parsed) return false
  return gospelBookNamePrefixesCanonicalRef(norm)
}

/** `Col. 2:14,15` — normalize book on the leading ref; may collapse to `2:14-15`. */
const COMMA_VERSE_TAIL_RE = /^(.+\d+:\s*\d+)((?:,\s*\d+(?::\s*\d+)?)+)$/

/** Bare verse numbers after a comma (same chapter), e.g. `,17` or `, 17`. */
function commaTailVerseNumbers(tail: string): number[] | null {
  const verses: number[] = []
  const re = /,\s*(\d+)(?::(\d+))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tail)) !== null) {
    if (m[2] != null) return null
    verses.push(parseInt(m[1], 10))
  }
  return verses.length > 0 ? verses : null
}

/**
 * Same-chapter consecutive comma list → hyphen range (`1:16,17` → `1:16-17`).
 * Non-contiguous lists (e.g. `Acts 2:23,36,37`) are left comma-separated.
 */
export function commaVerseTailToRange(head: string, tail: string): string | null {
  const headMatch = head.trim().match(/^(.+?)\s+(\d+):\s*(\d+)$/)
  if (!headMatch) return null
  const book = headMatch[1].trim()
  const chapter = parseInt(headMatch[2], 10)
  const verseStart = parseInt(headMatch[3], 10)
  const tailVerses = commaTailVerseNumbers(tail)
  if (!tailVerses) return null

  const all = [verseStart, ...tailVerses]
  for (let i = 1; i < all.length; i++) {
    if (all[i] !== all[i - 1] + 1) return null
  }
  const end = all[all.length - 1]
  if (end === verseStart) return null
  return `${book} ${chapter}:${verseStart}-${end}`
}

/** `R Revelation 4:4` / `J John 12:25` — drop stray abbrev letter before a real book name. */
function stripOrphanBookAbbrevPrefix(ref: string): string {
  const m = /^([A-Z])\.?\s+((?:\d+\s+)?[A-Z][a-z]{2,}[\s\S]*)$/.exec(ref.trim())
  if (!m) return ref
  const inner = m[2].trim()
  const innerNorm = normalizeScriptureReferenceStringInner(inner)
  if (innerNorm !== ref.trim() && isGospelCanonicalScriptureRef(innerNorm)) return innerNorm
  return ref
}

/** Core normalizer (no orphan-prefix pass). */
function normalizeScriptureReferenceStringInner(ref: string): string {
  const trimmed = ref.trim()
  if (!trimmed) return trimmed
  const withoutFollowing = stripFollowingVersesMarker(trimmed)
  const displayNorm = normalizeScriptureDisplay(
    normalizeThmlPeriodVerseSeparators(withoutFollowing).replace(/–/g, '-')
  )

  const commaTail = displayNorm.match(COMMA_VERSE_TAIL_RE)
  if (commaTail) {
    const normalizedHead = normalizeScriptureReferenceString(commaTail[1])
    const head = normalizedHead !== commaTail[1] ? normalizedHead : commaTail[1]
    const ranged = commaVerseTailToRange(head, commaTail[2])
    if (ranged) return ranged
    if (normalizedHead !== commaTail[1]) {
      return normalizedHead + commaTail[2].replace(/,\s+/g, ',')
    }
    return trimmed
  }

  const normalized = normalizedPassageDisplayForInline(displayNorm)
  if (!gospelBookNamePrefixesCanonicalRef(normalized) || !parseReference(normalized)) return trimmed
  return normalized
}

export function normalizeScriptureReferenceString(ref: string): string {
  const trimmed = ref.trim()
  if (!trimmed) return trimmed
  const stripped = stripOrphanBookAbbrevPrefix(trimmed)
  if (stripped !== trimmed) return stripped
  return normalizeScriptureReferenceStringInner(trimmed)
}

/**
 * Replace contiguous `Book chapter:verse` spans in HTML when normalization yields a canonical Gospel ref.
 * Does not rewrite refs split across inline tags (runtime inject handles those).
 */
function replaceScriptureMatchesInText(text: string): string {
  const withInheritedBooks = expandSemicolonInheritedBookRefs(text)
  const re = buildScripturePlainTextRegex()
  return withInheritedBooks.replace(re, (match) => {
    const normalized = normalizeScriptureReferenceString(match)
    return normalized !== match.trim() ? normalized : match
  })
}

/**
 * Replace contiguous `Book chapter:verse` spans in HTML when normalization yields a canonical Gospel ref.
 * Applies to abbreviated and canonical books (comma lists, `f.`, en-dash ranges, etc.).
 * Does not rewrite refs split across inline tags (runtime inject handles those).
 */
export function normalizeScriptureReferencesInHtml(html: string): string {
  if (!html?.trim()) return html
  return replaceScriptureMatchesInText(preprocessScriptureHtmlForNormalize(html))
}

export type ScriptureAuditIssue = {
  field: string
  match: string
  reason: 'unresolved_abbrev' | 'non_contiguous_comma_list'
  normalized: string
}

const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December'

/** Calendar dates and section headings matched as `Book chapter` by the plain-text regex. */
function looksLikeCalendarOrSectionHeadingFalsePositive(match: string): boolean {
  const t = match.trim()
  if (/^CHAPTER\s+\d+$/i.test(t)) return true
  if (/^SECTION\s+\d+$/i.test(t)) return true
  if (/^PART\s+(?:[IVXLCDM]+|\d+)$/i.test(t)) return true
  if (/^ARTICLE\s+[IVXLCDM]+$/i.test(t)) return true
  if (new RegExp(`^(?:${MONTH_NAMES})\\s+\\d{1,2}(?:,|\\s|$)`, 'i').test(t)) return true
  if (new RegExp(`^\\d{1,2}\\s+(?:${MONTH_NAMES})\\s+\\d{4}$`, 'i').test(t)) return true
  // Prose like "After 4,000 years" (regex stops at the thousands comma).
  if (/^After\s+\d+$/i.test(t)) return true
  return false
}

/** `Book chapter` match immediately before `,000` (thousands separator), not a verse list. */
function looksLikeThousandsCommaFalsePositive(plain: string, matchStart: number, match: string): boolean {
  const tail = plain.slice(matchStart + match.length)
  return /^,\d{3}\b/.test(tail)
}

/** Skip prose false positives like `fulfilment of Psalms 22:14` (book group ate a leading phrase). */
function looksLikeIntentionalScriptureMatch(match: string): boolean {
  const head = match.replace(/\s+\d+:\d+[\s\S]*$/, '').trim()
  if (/\bMacc\./i.test(match)) return false
  if (/\bpp\.\s*\d/i.test(match)) return false
  if (/\bINTERPRETATION\s+OF\b/i.test(match)) return false
  if (/\bMilligan\b/i.test(match)) return false
  if (/\bArt\.\s*\d/i.test(match)) return false
  if (/\bArticles\s+\d/i.test(match)) return false
  if (/\bQuestion\s+\d/i.test(match)) return false
  if (/\bJDT\b/i.test(match)) return false
  if (/^IV\.\s+\d/i.test(match.trim())) return false
  if (/^\d+\s+to\s+\d+$/i.test(match.trim())) return false
  if (/^\d+\s+and\s+\d+$/i.test(match.trim())) return false
  if (/^\d+\s+[A-Za-z]/.test(head)) return true
  if (/^I{1,3}\s+[A-Za-z]/i.test(head)) return true
  if (/[A-Z][a-z]*\./.test(head)) return true
  const words = head.split(/\s+/)
  if (words.length <= 3 && /^[A-Z]/.test(words[0] ?? '')) return true
  return false
}

/** Find regex-matched refs that would stay non-canonical after normalization (missing alias, etc.). */
export function auditScriptureReferencesInText(text: string, field: string): ScriptureAuditIssue[] {
  if (!text?.trim()) return []
  const issues: ScriptureAuditIssue[] = []
  const plain = expandSemicolonInheritedBookRefs(preprocessScriptureHtmlForNormalize(text))
  const re = buildScripturePlainTextRegex()
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(plain)) !== null) {
    const match = m[0]
    const normalized = normalizeScriptureReferenceString(match)
    if (normalized !== match.trim()) continue

    const commaSource = stripFollowingVersesMarker(
      normalizeScriptureDisplay(match.replace(/–/g, '-'))
    )
    const commaTail = commaSource.match(COMMA_VERSE_TAIL_RE)
    if (commaTail) {
      const headNorm = normalizeScriptureReferenceString(commaTail[1])
      const head = headNorm !== commaTail[1] ? headNorm : commaTail[1]
      if (isGospelCanonicalScriptureRef(head) && !commaVerseTailToRange(head, commaTail[2])) {
        issues.push({
          field,
          match,
          reason: 'non_contiguous_comma_list',
          normalized,
        })
      }
      continue
    }

    if (isGospelCanonicalScriptureRef(normalized)) continue
    if (looksLikeCalendarOrSectionHeadingFalsePositive(match)) continue
    if (looksLikeThousandsCommaFalsePositive(plain, m.index, match)) continue
    if (!looksLikeIntentionalScriptureMatch(match)) continue
    issues.push({ field, match, reason: 'unresolved_abbrev', normalized })
  }
  return issues
}

export type ScriptureReplacement = { field: string; from: string; to: string }

export type NormalizeGospelDataResult = {
  data: GospelPresentationData
  changed: boolean
  replacements: ScriptureReplacement[]
}

function trackReplace(
  replacements: ScriptureReplacement[],
  field: string,
  from: string,
  to: string
): string {
  if (from !== to) replacements.push({ field, from, to })
  return to
}

function normalizeQuestions(
  questions: QuestionAnswer[] | undefined,
  fieldPrefix: string,
  replacements: ScriptureReplacement[]
): QuestionAnswer[] | undefined {
  if (!questions?.length) return questions
  return questions.map((q) => ({
    ...q,
    question: q.question
      ? trackReplace(
          replacements,
          `${fieldPrefix}.question`,
          q.question,
          normalizeScriptureReferencesInHtml(q.question)
        )
      : q.question,
    answer: q.answer
      ? trackReplace(
          replacements,
          `${fieldPrefix}.answer`,
          q.answer,
          normalizeScriptureReferencesInHtml(q.answer)
        )
      : q.answer,
  }))
}

function normalizeScriptureRefs(
  refs: ScriptureReference[] | undefined,
  fieldPrefix: string,
  replacements: ScriptureReplacement[]
): ScriptureReference[] | undefined {
  if (!refs?.length) return refs
  return refs.map((sr, i) => {
    const ref = sr.reference?.trim()
    if (!ref) return sr
    const next = normalizeScriptureReferenceString(ref)
    return {
      ...sr,
      reference: trackReplace(replacements, `${fieldPrefix}[${i}].reference`, ref, next),
    }
  })
}

function normalizeNested(
  nested: NestedSubsection[],
  fieldPrefix: string,
  replacements: ScriptureReplacement[]
): NestedSubsection[] {
  return nested.map((n, ni) => {
    const p = `${fieldPrefix}.nested[${ni}]`
    return {
      ...n,
      title: trackReplace(
        replacements,
        `${p}.title`,
        n.title,
        normalizeScriptureReferencesInHtml(n.title)
      ),
      content: trackReplace(
        replacements,
        `${p}.content`,
        n.content,
        normalizeScriptureReferencesInHtml(n.content)
      ),
      scriptureReferences: normalizeScriptureRefs(n.scriptureReferences, `${p}.scriptureReferences`, replacements),
      questions: normalizeQuestions(n.questions, `${p}.questions`, replacements),
    }
  })
}

function normalizeSubsections(
  subsections: Subsection[],
  fieldPrefix: string,
  replacements: ScriptureReplacement[]
): Subsection[] {
  return subsections.map((sub, si) => {
    const p = `${fieldPrefix}.subsections[${si}]`
    return {
      ...sub,
      title: trackReplace(
        replacements,
        `${p}.title`,
        sub.title,
        normalizeScriptureReferencesInHtml(sub.title)
      ),
      content: trackReplace(
        replacements,
        `${p}.content`,
        sub.content,
        normalizeScriptureReferencesInHtml(sub.content)
      ),
      scriptureReferences: normalizeScriptureRefs(sub.scriptureReferences, `${p}.scriptureReferences`, replacements),
      questions: normalizeQuestions(sub.questions, `${p}.questions`, replacements),
      nestedSubsections: sub.nestedSubsections?.length
        ? normalizeNested(sub.nestedSubsections, p, replacements)
        : sub.nestedSubsections,
    }
  })
}

function normalizeSection(sec: GospelSection, sectionIndex: number, replacements: ScriptureReplacement[]): GospelSection {
  const p = `sections[${sectionIndex}]`
  return {
    ...sec,
    title: trackReplace(
      replacements,
      `${p}.title`,
      sec.title,
      normalizeScriptureReferencesInHtml(sec.title)
    ),
    subsections: normalizeSubsections(sec.subsections ?? [], p, replacements),
  }
}

function collectAuditFromQuestions(
  questions: QuestionAnswer[] | undefined,
  fieldPrefix: string,
  issues: ScriptureAuditIssue[]
): void {
  if (!questions?.length) return
  for (const q of questions) {
    if (q.question) issues.push(...auditScriptureReferencesInText(q.question, `${fieldPrefix}.question`))
    if (q.answer) issues.push(...auditScriptureReferencesInText(q.answer, `${fieldPrefix}.answer`))
  }
}

function collectAuditFromScriptureRefs(
  refs: ScriptureReference[] | undefined,
  fieldPrefix: string,
  issues: ScriptureAuditIssue[]
): void {
  if (!refs?.length) return
  for (const [i, sr] of refs.entries()) {
    const ref = sr.reference?.trim()
    if (!ref) continue
    const normalized = normalizeScriptureReferenceString(ref)
    if (normalized !== ref && isGospelCanonicalScriptureRef(normalized)) continue
    if (isGospelCanonicalScriptureRef(normalized)) {
      const commaTail = stripFollowingVersesMarker(normalized).match(COMMA_VERSE_TAIL_RE)
      if (commaTail && !commaVerseTailToRange(commaTail[1], commaTail[2])) {
        issues.push({
          field: `${fieldPrefix}[${i}].reference`,
          match: ref,
          reason: 'non_contiguous_comma_list',
          normalized,
        })
      }
      continue
    }
    if (normalized !== ref) continue
    issues.push({
      field: `${fieldPrefix}[${i}].reference`,
      match: ref,
      reason: 'unresolved_abbrev',
      normalized,
    })
  }
}

function collectAuditFromNested(
  nested: NestedSubsection[],
  fieldPrefix: string,
  issues: ScriptureAuditIssue[]
): void {
  for (const [ni, n] of nested.entries()) {
    const p = `${fieldPrefix}.nested[${ni}]`
    issues.push(...auditScriptureReferencesInText(n.title, `${p}.title`))
    issues.push(...auditScriptureReferencesInText(n.content, `${p}.content`))
    collectAuditFromScriptureRefs(n.scriptureReferences, `${p}.scriptureReferences`, issues)
    collectAuditFromQuestions(n.questions, p, issues)
  }
}

function collectAuditFromSubsections(
  subsections: Subsection[],
  fieldPrefix: string,
  issues: ScriptureAuditIssue[]
): void {
  for (const [si, sub] of subsections.entries()) {
    const p = `${fieldPrefix}.subsections[${si}]`
    issues.push(...auditScriptureReferencesInText(sub.title, `${p}.title`))
    issues.push(...auditScriptureReferencesInText(sub.content, `${p}.content`))
    collectAuditFromScriptureRefs(sub.scriptureReferences, `${p}.scriptureReferences`, issues)
    collectAuditFromQuestions(sub.questions, p, issues)
    if (sub.nestedSubsections?.length) collectAuditFromNested(sub.nestedSubsections, p, issues)
  }
}

/** Report scripture spans that still will not parse as verse-card refs after normalization. */
export function auditGospelPresentationData(sections: GospelPresentationData): ScriptureAuditIssue[] {
  const issues: ScriptureAuditIssue[] = []
  for (const [i, sec] of (sections ?? []).entries()) {
    const p = `sections[${i}]`
    issues.push(...auditScriptureReferencesInText(sec.title, `${p}.title`))
    collectAuditFromSubsections(sec.subsections ?? [], p, issues)
  }
  return issues
}

/** Deep-normalize gospel_data scripture in HTML and scriptureReferences fields. */
export function normalizeGospelPresentationData(
  sections: GospelPresentationData
): NormalizeGospelDataResult {
  const replacements: ScriptureReplacement[] = []
  const data = (sections ?? []).map((sec, i) => normalizeSection(sec, i, replacements))
  return { data, changed: replacements.length > 0, replacements }
}
