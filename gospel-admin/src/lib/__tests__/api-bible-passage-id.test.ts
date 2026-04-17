import {
  bookNameToUsfm,
  canonicalScriptureCacheReference,
  referenceToApiBiblePassageId,
} from '@/lib/api-bible-passage-id'

describe('api-bible-passage-id', () => {
  it('maps book names to USFM', () => {
    expect(bookNameToUsfm('John')).toBe('JHN')
    expect(bookNameToUsfm('Psalm')).toBe('PSA')
    expect(bookNameToUsfm('Psalms')).toBe('PSA')
    expect(bookNameToUsfm('1 Corinthians')).toBe('1CO')
    expect(bookNameToUsfm('Song of Solomon')).toBe('SNG')
  })

  it('builds passage ids for verse, range, and chapter', () => {
    expect(referenceToApiBiblePassageId('John 3:16')).toBe('JHN.3.16')
    expect(referenceToApiBiblePassageId('John 3:16-18')).toBe('JHN.3.16-JHN.3.18')
    expect(referenceToApiBiblePassageId('Psalm 23')).toBe('PSA.23')
  })

  it('returns null for unknown books or invalid references', () => {
    expect(referenceToApiBiblePassageId('Unknown 1:1')).toBeNull()
    expect(referenceToApiBiblePassageId('not a ref')).toBeNull()
  })

  describe('canonicalScriptureCacheReference', () => {
    it('matches referenceToApiBiblePassageId when the reference parses', () => {
      expect(canonicalScriptureCacheReference('Psalms 23:4a')).toBe('PSA.23.4')
      expect(canonicalScriptureCacheReference('Psalm 23:4')).toBe('PSA.23.4')
      expect(canonicalScriptureCacheReference('John 3:16b')).toBe('JHN.3.16')
      expect(canonicalScriptureCacheReference('Isaiah 40:25–26')).toBe('ISA.40.25-ISA.40.26')
    })

    it('falls back to suffix-stripped text when passage id cannot be built', () => {
      expect(canonicalScriptureCacheReference('not a ref')).toBe('not a ref')
    })
  })
})
