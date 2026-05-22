/**
 * CCEL Matthew Henry complete commentary volumes (`mhc1.xml`–`mhc6.xml`).
 * @see https://www.ccel.org/ccel/henry/mhc.html
 */

export interface HenryCcelVolume {
  id: string
  url: string
  /** Canonical USFM books contained in this volume (for validation / import filters). */
  books: string[]
}

const CCEL_BASE = 'https://www.ccel.org/ccel/henry'

export function henryVolumeUrl(volumeId: string): string {
  const id = volumeId.replace(/\.xml$/i, '').trim()
  return `${CCEL_BASE}/${id}.xml`
}

/** Six CCEL volumes in catalog order. */
export const HENRY_CCEL_VOLUMES: HenryCcelVolume[] = [
  {
    id: 'mhc1',
    url: henryVolumeUrl('mhc1'),
    books: ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'],
  },
  {
    id: 'mhc2',
    url: henryVolumeUrl('mhc2'),
    books: ['JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST'],
  },
  {
    id: 'mhc3',
    url: henryVolumeUrl('mhc3'),
    books: ['JOB', 'PSA', 'PRO', 'ECC', 'SNG'],
  },
  {
    id: 'mhc4',
    url: henryVolumeUrl('mhc4'),
    books: [
      'ISA',
      'JER',
      'LAM',
      'EZK',
      'DAN',
      'HOS',
      'JOL',
      'AMO',
      'OBA',
      'JON',
      'MIC',
      'NAM',
      'HAB',
      'ZEP',
      'HAG',
      'ZEC',
      'MAL',
    ],
  },
  {
    id: 'mhc5',
    url: henryVolumeUrl('mhc5'),
    books: ['MAT', 'MRK', 'LUK', 'JHN'],
  },
  {
    id: 'mhc6',
    url: henryVolumeUrl('mhc6'),
    books: [
      'ACT',
      'ROM',
      '1CO',
      '2CO',
      'GAL',
      'EPH',
      'PHP',
      'COL',
      '1TH',
      '2TH',
      '1TI',
      '2TI',
      'TIT',
      'PHM',
      'HEB',
      'JAS',
      '1PE',
      '2PE',
      '1JN',
      '2JN',
      '3JN',
      'JUD',
      'REV',
    ],
  },
]

const VOLUME_BY_ID = new Map(HENRY_CCEL_VOLUMES.map((v) => [v.id, v]))

export function getHenryVolume(volumeId: string): HenryCcelVolume | undefined {
  return VOLUME_BY_ID.get(volumeId.replace(/\.xml$/i, '').trim())
}

/** USFM books that receive commentary from at least one volume. */
export function allHenryBookUsfms(): string[] {
  const set = new Set<string>()
  for (const v of HENRY_CCEL_VOLUMES) {
    v.books.forEach((b) => set.add(b))
  }
  return [...set].sort()
}

export function volumesForBook(usfm: string): HenryCcelVolume[] {
  const u = usfm.toUpperCase()
  return HENRY_CCEL_VOLUMES.filter((v) => v.books.includes(u))
}
