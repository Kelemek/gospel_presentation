/**
 * CCEL Calvin commentary volumes (`calcom01.xml`–`calcom45.xml`) and how they map to canonical USFM books.
 * @see https://www.ccel.org/ccel/calvin/commentaries.html
 */

export type CalvinVolumeKind = 'standard' | 'multiBook' | 'harmonyLaw' | 'harmonyGospels'

export interface CalvinCcelVolume {
  id: string
  /** Primary URL for ThML import */
  url: string
  kind: CalvinVolumeKind
  /** Present when the whole file is one canonical book (possibly split across multiple volume files). */
  bookUsfm?: string
  /** For multi-book files, books expected after parsing (used for validation). */
  books?: string[]
}

const CCEL_BASE = 'https://www.ccel.org/ccel/calvin'

export function calvinVolumeUrl(volumeId: string): string {
  const id = volumeId.replace(/\.xml$/i, '').trim()
  return `${CCEL_BASE}/${id}.xml`
}

/** All 45 CCEL volumes in catalog order. */
export const CALVIN_CCEL_VOLUMES: CalvinCcelVolume[] = [
  { id: 'calcom01', url: calvinVolumeUrl('calcom01'), kind: 'standard', bookUsfm: 'GEN' },
  { id: 'calcom02', url: calvinVolumeUrl('calcom02'), kind: 'standard', bookUsfm: 'GEN' },
  { id: 'calcom03', url: calvinVolumeUrl('calcom03'), kind: 'harmonyLaw' },
  { id: 'calcom04', url: calvinVolumeUrl('calcom04'), kind: 'harmonyLaw' },
  { id: 'calcom05', url: calvinVolumeUrl('calcom05'), kind: 'harmonyLaw' },
  { id: 'calcom06', url: calvinVolumeUrl('calcom06'), kind: 'harmonyLaw' },
  { id: 'calcom07', url: calvinVolumeUrl('calcom07'), kind: 'standard', bookUsfm: 'JOS' },
  { id: 'calcom08', url: calvinVolumeUrl('calcom08'), kind: 'standard', bookUsfm: 'PSA' },
  { id: 'calcom09', url: calvinVolumeUrl('calcom09'), kind: 'standard', bookUsfm: 'PSA' },
  { id: 'calcom10', url: calvinVolumeUrl('calcom10'), kind: 'standard', bookUsfm: 'PSA' },
  { id: 'calcom11', url: calvinVolumeUrl('calcom11'), kind: 'standard', bookUsfm: 'PSA' },
  { id: 'calcom12', url: calvinVolumeUrl('calcom12'), kind: 'standard', bookUsfm: 'PSA' },
  { id: 'calcom13', url: calvinVolumeUrl('calcom13'), kind: 'standard', bookUsfm: 'ISA' },
  { id: 'calcom14', url: calvinVolumeUrl('calcom14'), kind: 'standard', bookUsfm: 'ISA' },
  { id: 'calcom15', url: calvinVolumeUrl('calcom15'), kind: 'standard', bookUsfm: 'ISA' },
  { id: 'calcom16', url: calvinVolumeUrl('calcom16'), kind: 'standard', bookUsfm: 'ISA' },
  { id: 'calcom17', url: calvinVolumeUrl('calcom17'), kind: 'standard', bookUsfm: 'JER' },
  { id: 'calcom18', url: calvinVolumeUrl('calcom18'), kind: 'standard', bookUsfm: 'JER' },
  { id: 'calcom19', url: calvinVolumeUrl('calcom19'), kind: 'standard', bookUsfm: 'JER' },
  { id: 'calcom20', url: calvinVolumeUrl('calcom20'), kind: 'standard', bookUsfm: 'JER' },
  { id: 'calcom21', url: calvinVolumeUrl('calcom21'), kind: 'standard', bookUsfm: 'LAM' },
  { id: 'calcom22', url: calvinVolumeUrl('calcom22'), kind: 'standard', bookUsfm: 'EZK' },
  { id: 'calcom23', url: calvinVolumeUrl('calcom23'), kind: 'standard', bookUsfm: 'EZK' },
  { id: 'calcom24', url: calvinVolumeUrl('calcom24'), kind: 'standard', bookUsfm: 'DAN' },
  { id: 'calcom25', url: calvinVolumeUrl('calcom25'), kind: 'standard', bookUsfm: 'DAN' },
  { id: 'calcom26', url: calvinVolumeUrl('calcom26'), kind: 'standard', bookUsfm: 'HOS' },
  {
    id: 'calcom27',
    url: calvinVolumeUrl('calcom27'),
    kind: 'multiBook',
    books: ['JOL', 'AMO', 'OBA'],
  },
  {
    id: 'calcom28',
    url: calvinVolumeUrl('calcom28'),
    kind: 'multiBook',
    books: ['JON', 'MIC', 'NAH'],
  },
  {
    id: 'calcom29',
    url: calvinVolumeUrl('calcom29'),
    kind: 'multiBook',
    books: ['HAB', 'ZEP', 'HAG'],
  },
  {
    id: 'calcom30',
    url: calvinVolumeUrl('calcom30'),
    kind: 'multiBook',
    books: ['ZEC', 'MAL'],
  },
  { id: 'calcom31', url: calvinVolumeUrl('calcom31'), kind: 'harmonyGospels' },
  { id: 'calcom32', url: calvinVolumeUrl('calcom32'), kind: 'harmonyGospels' },
  { id: 'calcom33', url: calvinVolumeUrl('calcom33'), kind: 'harmonyGospels' },
  { id: 'calcom34', url: calvinVolumeUrl('calcom34'), kind: 'standard', bookUsfm: 'JHN' },
  { id: 'calcom35', url: calvinVolumeUrl('calcom35'), kind: 'standard', bookUsfm: 'JHN' },
  { id: 'calcom36', url: calvinVolumeUrl('calcom36'), kind: 'standard', bookUsfm: 'ACT' },
  { id: 'calcom37', url: calvinVolumeUrl('calcom37'), kind: 'standard', bookUsfm: 'ACT' },
  { id: 'calcom38', url: calvinVolumeUrl('calcom38'), kind: 'standard', bookUsfm: 'ROM' },
  {
    id: 'calcom39',
    url: calvinVolumeUrl('calcom39'),
    kind: 'multiBook',
    books: ['1CO', '2CO'],
  },
  {
    id: 'calcom40',
    url: calvinVolumeUrl('calcom40'),
    kind: 'multiBook',
    books: ['1CO', '2CO'],
  },
  {
    id: 'calcom41',
    url: calvinVolumeUrl('calcom41'),
    kind: 'multiBook',
    books: ['GAL', 'EPH'],
  },
  {
    id: 'calcom42',
    url: calvinVolumeUrl('calcom42'),
    kind: 'multiBook',
    books: ['PHP', 'COL', '1TH', '2TH'],
  },
  {
    id: 'calcom43',
    url: calvinVolumeUrl('calcom43'),
    kind: 'multiBook',
    books: ['1TI', '2TI', 'TIT', 'PHM'],
  },
  { id: 'calcom44', url: calvinVolumeUrl('calcom44'), kind: 'standard', bookUsfm: 'HEB' },
  {
    id: 'calcom45',
    url: calvinVolumeUrl('calcom45'),
    kind: 'multiBook',
    books: ['JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD'],
  },
]

const VOLUME_BY_ID = new Map(CALVIN_CCEL_VOLUMES.map((v) => [v.id, v]))

export function getCalvinVolume(volumeId: string): CalvinCcelVolume | undefined {
  return VOLUME_BY_ID.get(volumeId.replace(/\.xml$/i, '').trim())
}

/** USFM books that receive commentary from at least one volume (for import-all). */
export function allCalvinBookUsfms(): string[] {
  const set = new Set<string>()
  for (const v of CALVIN_CCEL_VOLUMES) {
    if (v.bookUsfm) set.add(v.bookUsfm)
    v.books?.forEach((b) => set.add(b))
  }
  set.add('EXO')
  set.add('LEV')
  set.add('NUM')
  set.add('DEU')
  set.add('MAT')
  set.add('MRK')
  set.add('LUK')
  return [...set].sort()
}

export function volumesForBook(usfm: string): CalvinCcelVolume[] {
  const u = usfm.toUpperCase()
  return CALVIN_CCEL_VOLUMES.filter((v) => v.bookUsfm === u || v.books?.includes(u))
}
