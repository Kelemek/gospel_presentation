import { parseReference } from '@/lib/parse-scripture-reference'

/**
 * Map common English book names/aliases to USFM-style IDs used by API.Bible passage paths.
 * @see https://rest.api.bible — passageId e.g. JHN.3.16 or JHN.3.16-JHN.3.18 or PSA.23
 */
const BOOK_ALIAS_TO_USFM: Record<string, string> = {
  genesis: 'GEN',
  ge: 'GEN',
  ac: 'ACT',
  habak: 'HAB',
  exodus: 'EXO',
  leviticus: 'LEV',
  numbers: 'NUM',
  deuteronomy: 'DEU',
  deut: 'DEU',
  deu: 'DEU',
  dut: 'DEU',
  joshua: 'JOS',
  judges: 'JDG',
  ruth: 'RUT',
  '1 samuel': '1SA',
  '2 samuel': '2SA',
  '1 kings': '1KI',
  '2 kings': '2KI',
  '1 chronicles': '1CH',
  '2 chronicles': '2CH',
  chron: '1CH',
  '1 chron': '1CH',
  '2 chron': '2CH',
  ezra: 'EZR',
  nehemiah: 'NEH',
  esther: 'EST',
  job: 'JOB',
  psalm: 'PSA',
  psalms: 'PSA',
  psa: 'PSA',
  psal: 'PSA',
  proverbs: 'PRO',
  ecclesiastes: 'ECC',
  eccles: 'ECC',
  'song of solomon': 'SNG',
  'song of songs': 'SNG',
  isaiah: 'ISA',
  jeremiah: 'JER',
  lamentations: 'LAM',
  ezekiel: 'EZK',
  daniel: 'DAN',
  hosea: 'HOS',
  joel: 'JOL',
  amos: 'AMO',
  obadiah: 'OBA',
  jonah: 'JON',
  micah: 'MIC',
  nahum: 'NAM',
  habakkuk: 'HAB',
  zephaniah: 'ZEP',
  haggai: 'HAG',
  hag: 'HAG',
  zechariah: 'ZEC',
  malachi: 'MAL',
  matthew: 'MAT',
  mark: 'MRK',
  luke: 'LUK',
  john: 'JHN',
  acts: 'ACT',
  act: 'ACT',
  /** Common abbreviation (e.g. "Rom 8:28") */
  rom: 'ROM',
  '1 cor': '1CO',
  '2 cor': '2CO',
  '1 thess': '1TH',
  '2 thess': '2TH',
  '1 tim': '1TI',
  '2 tim': '2TI',
  '1 pet': '1PE',
  '2 pet': '2PE',
  prov: 'PRO',
  pro: 'PRO',
  matt: 'MAT',
  phil: 'PHP',
  philip: 'PHP',
  'i cor': '1CO',
  'ii cor': '2CO',
  'i pet': '1PE',
  'ii pet': '2PE',
  'i thess': '1TH',
  'ii thess': '2TH',
  'i tim': '1TI',
  'ii tim': '2TI',
  'i sam': '1SA',
  'ii sam': '2SA',
  'i ki': '1KI',
  'ii ki': '2KI',
  'i chr': '1CH',
  'ii chr': '2CH',
  numb: 'NUM',
  num: 'NUM',
  cant: 'SNG',
  canticles: 'SNG',
  song: 'SNG',
  songs: 'SNG',
  exod: 'EXO',
  heb: 'HEB',
  romans: 'ROM',
  '1 corinthians': '1CO',
  '2 corinthians': '2CO',
  galatians: 'GAL',
  ephesians: 'EPH',
  philippians: 'PHP',
  colossians: 'COL',
  colos: 'COL',
  '1 thessalonians': '1TH',
  '2 thessalonians': '2TH',
  '1 timothy': '1TI',
  '2 timothy': '2TI',
  titus: 'TIT',
  philemon: 'PHM',
  hebrews: 'HEB',
  james: 'JAS',
  '1 peter': '1PE',
  '2 peter': '2PE',
  '1 john': '1JN',
  '2 john': '2JN',
  '3 john': '3JN',
  jude: 'JUD',
  revelation: 'REV',
  'revelation of john': 'REV',
  // KJV-style names from DB / users
  'i samuel': '1SA',
  'ii samuel': '2SA',
  'i kings': '1KI',
  'ii kings': '2KI',
  'i chronicles': '1CH',
  'ii chronicles': '2CH',
  'i corinthians': '1CO',
  'ii corinthians': '2CO',
  'i thessalonians': '1TH',
  'ii thessalonians': '2TH',
  'i timothy': '1TI',
  'ii timothy': '2TI',
  'i peter': '1PE',
  'ii peter': '2PE',
  'i john': '1JN',
  'ii john': '2JN',
  'iii john': '3JN',
}

function normalizeBookKey(book: string): string {
  return book.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** CCEL Matthew Henry div1 titles use "First Samuel" / "Third John" instead of "1 Samuel". */
function expandFirstSecondThirdBookPrefix(key: string): string {
  return key
    .replace(/^first /, '1 ')
    .replace(/^second /, '2 ')
    .replace(/^third /, '3 ')
}

export function bookNameToUsfm(book: string): string | null {
  const key = normalizeBookKey(book)
  if (BOOK_ALIAS_TO_USFM[key]) return BOOK_ALIAS_TO_USFM[key]
  const expanded = expandFirstSecondThirdBookPrefix(key)
  if (expanded !== key && BOOK_ALIAS_TO_USFM[expanded]) return BOOK_ALIAS_TO_USFM[expanded]
  return null
}

/** Distinct USFM book codes used in passage keys (API.Bible style). */
const ALL_USFM_BOOK_CODES = new Set(Object.values(BOOK_ALIAS_TO_USFM))

/**
 * When a query is not a full verse reference, map it to USFM book codes for
 * {@code spurgeon_passage_index} prefix search (any passage in that book).
 * Matches if a canonical alias or any word in an alias starts with the query,
 * or if a USFM code starts with a compact alphanumeric query (e.g. {@code jhn}, {@code 1co}).
 * Single-digit-only queries are ignored as too ambiguous.
 */
/** Collapse spaced letter-by-letter typing (e.g. {@code d u t}) for book-prefix matching. */
function compactBookSearchQuery(query: string): string {
  return query.replace(/\s+/g, '')
}

export function usfmBookPrefixesForSearchQuery(query: string): string[] {
  const raw = query.trim()
  if (!raw) return []

  const q = normalizeBookKey(raw)
  const qCompact = compactBookSearchQuery(q)
  const variants = qCompact !== q && qCompact.length > 0 ? [q, qCompact] : [q]

  const codes = new Set<string>()

  for (const variant of variants) {
    if (!/^[a-z0-9\s]+$/i.test(variant)) continue
    if (variant.length === 1 && /^\d$/.test(variant)) continue

    const exact = BOOK_ALIAS_TO_USFM[variant]
    if (exact) {
      codes.add(exact)
      continue
    }

    for (const [alias, usfm] of Object.entries(BOOK_ALIAS_TO_USFM)) {
      const a = normalizeBookKey(alias)
      if (a.startsWith(variant)) {
        codes.add(usfm)
        continue
      }
      for (const w of a.split(/\s+/)) {
        if (w.length > 0 && w.startsWith(variant)) {
          codes.add(usfm)
          break
        }
      }
    }

    if (variant.length > 0 && /^[0-9a-z]+$/i.test(variant)) {
      const cl = variant.toUpperCase()
      for (const code of ALL_USFM_BOOK_CODES) {
        if (code.toLowerCase().startsWith(cl.toLowerCase())) {
          codes.add(code)
        }
      }
    }
  }

  return [...codes]
}

/**
 * Build API.Bible passageId from a user reference like "John 3:16".
 */
export function referenceToApiBiblePassageId(reference: string): string | null {
  const parsed = parseReference(reference.trim())
  if (!parsed) return null

  const code = bookNameToUsfm(parsed.book)
  if (!code) return null

  const { chapter, verseStart, verseEnd } = parsed

  if (verseStart === null) {
    return `${code}.${chapter}`
  }

  const startId = `${code}.${chapter}.${verseStart}`
  if (verseEnd !== null && verseEnd !== verseStart) {
    return `${startId}-${code}.${chapter}.${verseEnd}`
  }
  return startId
}

/**
 * Stable key for `scripture_cache.reference`: same USFM passage id as API.Bible / {@link referenceToApiBiblePassageId}
 * when the reference parses (unifies Psalm/Psalms, `:4a` → `:4`, en-dash ranges). Falls back to trimmed/suffix-stripped
 * text if parsing fails.
 */
export function canonicalScriptureCacheReference(reference: string): string {
  const passageId = referenceToApiBiblePassageId(reference)
  if (passageId) return passageId
  return reference.replace(/–/g, '-').replace(/(\d+)[a-z]+/g, '$1').trim()
}
