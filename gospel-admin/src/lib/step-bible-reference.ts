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

/** Data row prefix: Rom.12.2#01=NKO; 2Co.13.13[13.14]#01=NKO uses bracket for English verse. */
const STEP_WORD_LINE_RE = /^([1-3]?[A-Za-z]{2,4})\.(\d+)\.(\d+)(?:\[(\d+)\.(\d+)\])?#\d+=/

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
  let chapter = parseInt(m[2], 10)
  let verse = parseInt(m[3], 10)
  if (m[4] !== undefined && m[5] !== undefined) {
    chapter = parseInt(m[4], 10)
    verse = parseInt(m[5], 10)
  }
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

/** Protestant canon OT passages in Biblical Aramaic (ESV verse numbering). */
export function isAramaicVerse(usfm: string, chapter: number, verse: number): boolean {
  const book = usfm.toUpperCase()
  if (book === 'DAN') {
    if (chapter >= 3 && chapter <= 7) return true
    if (chapter === 2 && verse >= 4) return true
    return false
  }
  if (book === 'EZR') {
    if (chapter === 4 && verse >= 8) return true
    if (chapter === 5) return true
    if (chapter === 6 && verse <= 18) return true
    if (chapter === 7 && verse >= 12 && verse <= 26) return true
    return false
  }
  if (book === 'JER' && chapter === 10 && verse === 11) return true
  if (book === 'GEN' && chapter === 31 && verse === 47) return true
  return false
}

export type WordStudyLanguageLabel = 'Greek' | 'Hebrew' | 'Aramaic'

export function wordStudyLanguageLabelFromPassageKey(
  language: 'heb' | 'grc',
  passageKey: string
): WordStudyLanguageLabel {
  if (language === 'grc') return 'Greek'
  const m = passageKey.match(/^([A-Z0-9]{2,3})\.(\d+)\.(\d+)$/)
  if (m && isAramaicVerse(m[1], parseInt(m[2], 10), parseInt(m[3], 10))) return 'Aramaic'
  return 'Hebrew'
}

/** Toolbar label for the word-study toggle (from reference, before fetch). */
export function wordStudyLanguageLabelFromReference(reference: string): WordStudyLanguageLabel | null {
  const first = wordStudyTargetsFromReference(reference)[0]
  if (!first) return null
  return wordStudyLanguageLabelFromPassageKey(first.language, first.passageKey)
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

/** USFM book code → display name for concordance links (e.g. ROM → Romans). */
const USFM_TO_BOOK_DISPLAY: Record<string, string> = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  EST: 'Esther',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  EZK: 'Ezekiel',
  DAN: 'Daniel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
}

/** USFM passage key (ROM.12.2) → English reference (Romans 12:2). */
export function passageKeyToReference(passageKey: string): string | null {
  const m = passageKey.trim().match(/^([A-Z0-9]{2,3})\.(\d+)\.(\d+)$/)
  if (!m) return null
  const book = USFM_TO_BOOK_DISPLAY[m[1]]
  if (!book) return null
  return `${book} ${m[2]}:${m[3]}`
}
