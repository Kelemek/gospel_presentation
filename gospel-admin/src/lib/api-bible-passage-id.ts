import { parseReference } from '@/lib/parse-scripture-reference'

/**
 * Map common English book names/aliases to USFM-style IDs used by API.Bible passage paths.
 * @see https://rest.api.bible — passageId e.g. JHN.3.16 or JHN.3.16-JHN.3.18 or PSA.23
 */
const BOOK_ALIAS_TO_USFM: Record<string, string> = {
  genesis: 'GEN',
  exodus: 'EXO',
  leviticus: 'LEV',
  numbers: 'NUM',
  deuteronomy: 'DEU',
  joshua: 'JOS',
  judges: 'JDG',
  ruth: 'RUT',
  '1 samuel': '1SA',
  '2 samuel': '2SA',
  '1 kings': '1KI',
  '2 kings': '2KI',
  '1 chronicles': '1CH',
  '2 chronicles': '2CH',
  ezra: 'EZR',
  nehemiah: 'NEH',
  esther: 'EST',
  job: 'JOB',
  psalm: 'PSA',
  psalms: 'PSA',
  proverbs: 'PRO',
  ecclesiastes: 'ECC',
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
  zechariah: 'ZEC',
  malachi: 'MAL',
  matthew: 'MAT',
  mark: 'MRK',
  luke: 'LUK',
  john: 'JHN',
  acts: 'ACT',
  romans: 'ROM',
  '1 corinthians': '1CO',
  '2 corinthians': '2CO',
  galatians: 'GAL',
  ephesians: 'EPH',
  philippians: 'PHP',
  colossians: 'COL',
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

export function bookNameToUsfm(book: string): string | null {
  const key = normalizeBookKey(book)
  if (BOOK_ALIAS_TO_USFM[key]) return BOOK_ALIAS_TO_USFM[key]
  return null
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
