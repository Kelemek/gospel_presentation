import { parseReference } from '@/lib/parse-scripture-reference'
import {
  isGospelCanonicalScriptureRef,
  normalizeScriptureDisplay,
  normalizeScriptureReferenceString,
  scanCanonicalScriptureSpansInPlainText,
} from '@/lib/scriptureReferenceNormalize'
import { normalizedPassageDisplayForInline } from '@/lib/spurgeon/ccelSermonHtml'

/** Jay Adams CCNT/P worklist abbreviations not covered by ThML alias table. */
const JAY_ADAMS_BOOK_ABBREV: Record<string, string> = {
  pr: 'Prov',
  prov: 'Prov',
  ex: 'Ex',
  gen: 'Gen',
  dt: 'Deut',
  deut: 'Deut',
  '1sa': '1 Sam',
  '2sa': '2 Sam',
  '1co': '1 Cor',
  '2co': '2 Cor',
  '1th': '1 Thess',
  '2th': '2 Thess',
  '1ti': '1 Tim',
  '2ti': '2 Tim',
  '1pe': '1 Pet',
  '2pe': '2 Pet',
  '1jn': '1 John',
  '2jn': '2 John',
  '3jn': '3 John',
  rm: 'Rom',
  rom: 'Rom',
  mk: 'Mark',
  mt: 'Matt',
  lk: 'Luke',
  jn: 'John',
  ac: 'Acts',
  acts: 'Acts',
  php: 'Phil',
  phil: 'Phil',
  gal: 'Gal',
  eph: 'Eph',
  col: 'Col',
  tit: 'Titus',
  ti: 'Titus',
  jas: 'James',
  heb: 'Heb',
  jude: 'Jude',
  ps: 'Psalm',
  isa: 'Isa',
  is: 'Isa',
  jer: 'Jer',
  mal: 'Mal',
  lev: 'Lev',
  eze: 'Ezek',
  rev: 'Rev',
  phm: 'Philemon',
}

const WHOLE_BOOK_RE = /^(.+?),\s*book\s+of\s*$/i

const NUMBERED_BOOK_CHAPTER_RANGE_RE =
  /^((?:\d+\s*)?[A-Za-z][A-Za-z.]*)\s+(\d+)\s*-\s*(\d+)\s*$/

const COMMA_CHAPTER_LIST_RE =
  /^((?:\d+\s*)?[A-Za-z][A-Za-z.]*)\s+([\d,\s]+)\s*$/

const HAS_BOOK_PREFIX_RE = /^(?:\d+\s+)?[A-Za-z]/

const SEMICOLON_CHAPTER_VERSE_RE = /^(\d+):(.+)$/

function expandJayAdamsBookToken(token: string): string {
  const trimmed = token.trim().replace(/\./g, '')
  const lower = trimmed.toLowerCase()
  const mapped = JAY_ADAMS_BOOK_ABBREV[lower]
  if (mapped) return mapped
  return token.trim()
}

function expandLeadingBookAbbrev(segment: string): string {
  const m = /^((?:\d+\s*)?[A-Za-z][A-Za-z.]*)([\s\S]*)$/.exec(segment.trim())
  if (!m) return segment
  return `${expandJayAdamsBookToken(m[1])}${m[2]}`
}

function canonicalizeSegment(segment: string): string {
  const display = normalizeScriptureDisplay(segment.replace(/\u2013/g, '-').replace(/ff\.?/gi, ''))
  const normalized = normalizedPassageDisplayForInline(display)
  return normalized
}

/** Split `Book ch:v, v, v-v` into discrete canonical references. */
export function expandCommaSeparatedVerseTails(reference: string): string[] {
  const trimmed = reference.trim().replace(/\u2013/g, '-')
  const m = /^(.+?)\s+(\d+):(.+)$/.exec(trimmed)
  if (!m) {
    const parsed = parseReference(trimmed)
    if (parsed && parsed.verseStart !== null) return [trimmed]
    return []
  }

  const tail = m[3].trim()
  if (!tail.includes(',')) {
    const single = normalizeScriptureDisplay(
      `${normalizedPassageDisplayForInline(m[1].trim())} ${m[2]}:${tail.replace(/\s+/g, '')}`
    )
    return parseReference(single) ? [single] : []
  }

  const book = normalizedPassageDisplayForInline(m[1].trim())
  const chapter = m[2]
  const pieces = tail.replace(/\s+/g, '').split(',').filter(Boolean)
  const out: string[] = []

  for (const piece of pieces) {
    const range = /^(\d+)-(\d+)$/.exec(piece)
    if (range) {
      out.push(normalizeScriptureDisplay(`${book} ${chapter}:${range[1]}-${range[2]}`))
      continue
    }
    if (/^\d+$/.test(piece)) {
      out.push(normalizeScriptureDisplay(`${book} ${chapter}:${piece}`))
    }
  }

  return out
    .map((ref) => normalizeScriptureReferenceString(ref))
    .filter((ref) => {
      const p = parseReference(ref)
      return p !== null && isGospelCanonicalScriptureRef(ref)
    })
}

function expandSegmentToCanonicalReferences(segment: string): string[] {
  const canonical = canonicalizeSegment(segment)

  const commaExpanded = expandCommaSeparatedVerseTails(canonical)
  if (commaExpanded.length > 0) return commaExpanded

  if (parseReference(canonical)) {
    const normalized = normalizeScriptureReferenceString(canonical)
    return parseReference(normalized) ? [normalized] : []
  }

  const spans = scanCanonicalScriptureSpansInPlainText(segment)
  if (spans.length > 0) {
    const refs: string[] = []
    for (const span of spans) {
      const expanded = expandCommaSeparatedVerseTails(span.cleanRef)
      refs.push(
        ...(expanded.length > 0
          ? expanded
          : [normalizeScriptureReferenceString(span.cleanRef)])
      )
    }
    return refs
  }

  return []
}

/** Preprocess one worklist line into segments before canonical expansion. */
export function preprocessJayAdamsWorklistLine(line: string): string[] {
  const trimmed = line.trim().replace(/\u2013/g, '-').replace(/\u2014/g, '-')
  if (!trimmed) return []

  const wholeBook = WHOLE_BOOK_RE.exec(trimmed)
  if (wholeBook) {
    const book = expandJayAdamsBookToken(wholeBook[1].trim())
    return [`${book} 1`]
  }

  const work = trimmed.replace(/ff\.?/gi, '').replace(/\s+/g, ' ').trim()

  const chapterRange = NUMBERED_BOOK_CHAPTER_RANGE_RE.exec(work)
  if (chapterRange && !chapterRange[0].includes(':')) {
    const book = expandJayAdamsBookToken(chapterRange[1])
    const lo = parseInt(chapterRange[2], 10)
    const hi = parseInt(chapterRange[3], 10)
    const parts: string[] = []
    for (let ch = lo; ch <= hi; ch++) {
      parts.push(`${book} ${ch}`)
    }
    return parts
  }

  const commaChapters = COMMA_CHAPTER_LIST_RE.exec(work)
  if (commaChapters && !commaChapters[0].includes(':')) {
    const book = expandJayAdamsBookToken(commaChapters[1])
    const chapters = commaChapters[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (chapters.every((c) => /^\d+$/.test(c))) {
      return chapters.map((ch) => `${book} ${ch}`)
    }
  }

  const semicolonParts = work.split(';').map((p) => p.trim()).filter(Boolean)
  const expanded: string[] = []
  let priorBook: string | null = null

  for (const part of semicolonParts) {
    let segment = part
    if (HAS_BOOK_PREFIX_RE.test(segment)) {
      segment = expandLeadingBookAbbrev(segment)
    } else if (priorBook) {
      const chVerse = SEMICOLON_CHAPTER_VERSE_RE.exec(segment)
      if (chVerse) {
        segment = `${priorBook} ${chVerse[1]}:${chVerse[2]}`
      } else if (/^\d+$/.test(segment)) {
        segment = `${priorBook} ${segment}`
      } else {
        segment = `${priorBook} ${segment}`
      }
    } else {
      segment = expandLeadingBookAbbrev(segment)
    }
    expanded.push(segment)

    const refs = expandSegmentToCanonicalReferences(segment)
    const firstParsed = refs[0] ? parseReference(refs[0]) : null
    if (firstParsed) priorBook = firstParsed.book
  }

  return expanded
}

export type ParseJayAdamsLineResult = {
  references: string[]
  unresolved: string[]
}

/** Expand one worklist line into canonical Gospel scripture reference strings. */
export function parseJayAdamsWorklistLine(line: string): ParseJayAdamsLineResult {
  const segments = preprocessJayAdamsWorklistLine(line)
  const references: string[] = []
  const unresolved: string[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    const refs = expandSegmentToCanonicalReferences(segment)
    if (refs.length === 0) {
      unresolved.push(line)
      continue
    }
    for (const ref of refs) {
      const key = ref.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      references.push(ref)
    }
  }

  return { references, unresolved: [...new Set(unresolved)] }
}

/** Expand many worklist lines; dedupes within the batch. */
export function parseJayAdamsWorklistLines(lines: string[]): ParseJayAdamsLineResult {
  const references: string[] = []
  const unresolved: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const result = parseJayAdamsWorklistLine(line)
    for (const ref of result.references) {
      const key = ref.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      references.push(ref)
    }
    unresolved.push(...result.unresolved)
  }

  return { references, unresolved: [...new Set(unresolved)] }
}
