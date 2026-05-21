import { bookNameToUsfm, referenceToApiBiblePassageId } from '@/lib/api-bible-passage-id'
import { parseReference } from '@/lib/parse-scripture-reference'

/** USFM 3-letter code → STEPBible book abbrev (Gen., Rom., 1Co., …). */
const USFM_TO_STEP_BOOK: Record<string, string> = {
  GEN: 'Gen',
  EXO: 'Exo',
  LEV: 'Lev',
  NUM: 'Num',
  DEU: 'Deu',
  JOS: 'Jos',
  JDG: 'Jdg',
  RUT: 'Rut',
  '1SA': '1Sa',
  '2SA': '2Sa',
  '1KI': '1Ki',
  '2KI': '2Ki',
  '1CH': '1Ch',
  '2CH': '2Ch',
  EZR: 'Ezr',
  NEH: 'Neh',
  EST: 'Est',
  JOB: 'Job',
  PSA: 'Psa',
  PRO: 'Pro',
  ECC: 'Ecc',
  SNG: 'Sng',
  ISA: 'Isa',
  JER: 'Jer',
  LAM: 'Lam',
  EZK: 'Ezk',
  DAN: 'Dan',
  HOS: 'Hos',
  JOL: 'Jol',
  AMO: 'Amo',
  OBA: 'Oba',
  JON: 'Jon',
  MIC: 'Mic',
  NAM: 'Nam',
  HAB: 'Hab',
  ZEP: 'Zep',
  HAG: 'Hag',
  ZEC: 'Zec',
  MAL: 'Mal',
  MAT: 'Mat',
  MRK: 'Mrk',
  LUK: 'Luk',
  JHN: 'Jhn',
  ACT: 'Act',
  ROM: 'Rom',
  '1CO': '1Co',
  '2CO': '2Co',
  GAL: 'Gal',
  EPH: 'Eph',
  PHP: 'Php',
  COL: 'Col',
  '1TH': '1Th',
  '2TH': '2Th',
  '1TI': '1Ti',
  '2TI': '2Ti',
  TIT: 'Tit',
  PHM: 'Phm',
  HEB: 'Heb',
  JAS: 'Jas',
  '1PE': '1Pe',
  '2PE': '2Pe',
  '1JN': '1Jn',
  '2JN': '2Jn',
  '3JN': '3Jn',
  JUD: 'Jud',
  REV: 'Rev',
}

const STEP_TO_USFM: Record<string, string> = Object.fromEntries(
  Object.entries(USFM_TO_STEP_BOOK).map(([usfm, step]) => [step, usfm])
)

/** Data row prefix: Rom.12.2#01=NKO or Gen.1.1#01=L */
const STEP_WORD_LINE_RE = /^([1-3]?[A-Za-z]{2,4})\.(\d+)\.(\d+)#\d+=/

export function usfmBookToStepBook(usfm: string): string | null {
  return USFM_TO_STEP_BOOK[usfm.toUpperCase()] ?? null
}

export function stepBookToUsfmBook(stepBook: string): string | null {
  return STEP_TO_USFM[stepBook] ?? null
}

/**
 * USFM passage id (ROM.12.2) → STEPBible ref (Rom.12.2).
 */
export function usfmPassageIdToStepRef(passageId: string): string | null {
  const m = passageId.match(/^([A-Z0-9]{2,3})\.(\d+)\.(\d+)$/)
  if (!m) return null
  const stepBook = usfmBookToStepBook(m[1])
  if (!stepBook) return null
  return `${stepBook}.${m[2]}.${m[3]}`
}

/**
 * STEPBible ref (Rom.12.2) → USFM passage id (ROM.12.2).
 */
export function stepRefToUsfmPassageId(stepRef: string): string | null {
  const m = stepRef.match(/^([1-3]?[A-Za-z]{2,4})\.(\d+)\.(\d+)$/)
  if (!m) return null
  const usfm = stepBookToUsfmBook(m[1])
  if (!usfm) return null
  return `${usfm}.${m[2]}.${m[3]}`
}

export function isStepBibleWordDataLine(line: string): boolean {
  return STEP_WORD_LINE_RE.test(line.trim())
}

export function parseStepBibleWordLineRef(line: string): {
  stepBook: string
  chapter: number
  verse: number
  usfm: string
  stepRef: string
  passageKey: string
} | null {
  const m = line.trim().match(STEP_WORD_LINE_RE)
  if (!m) return null
  const stepBook = m[1]
  const chapter = parseInt(m[2], 10)
  const verse = parseInt(m[3], 10)
  const usfm = stepBookToUsfmBook(stepBook)
  if (!usfm) return null
  const passageKey = `${usfm}.${chapter}.${verse}`
  const stepRef = `${stepBook}.${chapter}.${verse}`
  return { stepBook, chapter, verse, usfm, stepRef, passageKey }
}

export type WordStudyPassageTarget = {
  reference: string
  passageKey: string
  stepRef: string
  usfm: string
  chapter: number
  verse: number
  language: 'heb' | 'grc'
}

const NT_USFM = new Set([
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
])

/**
 * Resolve user reference to one word-study target per verse (supports ranges in one chapter).
 */
export function wordStudyTargetsFromReference(reference: string): WordStudyPassageTarget[] {
  const trimmed = reference.trim()
  const parsed = parseReference(trimmed)
  if (!parsed || parsed.verseStart === null) return []

  const bookUsfm = bookNameToUsfm(parsed.book)
  if (!bookUsfm) return []

  const language: 'heb' | 'grc' = NT_USFM.has(bookUsfm) ? 'grc' : 'heb'
  const lo = Math.min(parsed.verseStart, parsed.verseEnd ?? parsed.verseStart)
  const hi = Math.max(parsed.verseStart, parsed.verseEnd ?? parsed.verseStart)
  const targets: WordStudyPassageTarget[] = []

  for (let verse = lo; verse <= hi; verse++) {
    const passageKey = `${bookUsfm}.${parsed.chapter}.${verse}`
    const stepRef = usfmPassageIdToStepRef(passageKey)
    if (!stepRef) continue
    targets.push({
      reference: trimmed,
      passageKey,
      stepRef,
      usfm: bookUsfm,
      chapter: parsed.chapter,
      verse,
      language,
    })
  }

  return targets
}

/** True when reference includes at least one verse (not chapter-only). */
export function wordStudyAvailableFromReference(reference: string): boolean {
  return wordStudyTargetsFromReference(reference).length > 0
}

/** First verse target (compat). */
export function wordStudyTargetFromReference(reference: string): WordStudyPassageTarget | null {
  return wordStudyTargetsFromReference(reference)[0] ?? null
}

/** Chapter JSON path segment: words/ROM/12.json */
export function stepBibleChapterWordsRelPath(usfm: string, chapter: number): string {
  return `words/${usfm}/${chapter}.json`
}

export function referenceToWordStudyPassageKey(reference: string): string | null {
  const id = referenceToApiBiblePassageId(reference.trim())
  if (!id) return null
  const single = id.match(/^([A-Z0-9]{2,3})\.(\d+)\.(\d+)$/)
  if (single) return id
  const range = id.match(/^([A-Z0-9]{2,3})\.(\d+)\.(\d+)-/)
  if (range) return `${range[1]}.${range[2]}.${range[3]}`
  return null
}
