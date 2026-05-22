import {
  bookNameToUsfm,
  canonicalScriptureCacheReference,
  referenceToApiBiblePassageId,
  usfmBookPrefixesForSearchQuery,
} from '@/lib/api-bible-passage-id'

describe('api-bible-passage-id', () => {
  it('maps book names to USFM', () => {
    expect(bookNameToUsfm('John')).toBe('JHN')
    expect(bookNameToUsfm('Psalm')).toBe('PSA')
    expect(bookNameToUsfm('Psalms')).toBe('PSA')
    expect(bookNameToUsfm('1 Corinthians')).toBe('1CO')
    expect(bookNameToUsfm('Song of Solomon')).toBe('SNG')
    expect(bookNameToUsfm('First Samuel')).toBe('1SA')
    expect(bookNameToUsfm('Second Kings')).toBe('2KI')
    expect(bookNameToUsfm('Third John')).toBe('3JN')
  })

  it('builds passage ids for verse, range, and chapter', () => {
    expect(referenceToApiBiblePassageId('John 3:16')).toBe('JHN.3.16')
    expect(referenceToApiBiblePassageId('John 3:16-18')).toBe('JHN.3.16-JHN.3.18')
    expect(referenceToApiBiblePassageId('Psalm 23')).toBe('PSA.23')
    expect(referenceToApiBiblePassageId('Rom 8:28')).toBe('ROM.8.28')
  })

  it('returns null for unknown books or invalid references', () => {
    expect(referenceToApiBiblePassageId('Unknown 1:1')).toBeNull()
    expect(referenceToApiBiblePassageId('not a ref')).toBeNull()
  })

  describe('usfmBookPrefixesForSearchQuery', () => {
    it('maps full or partial book names to USFM codes', () => {
      expect(usfmBookPrefixesForSearchQuery('John').sort()).toEqual(['JHN'])
      expect(usfmBookPrefixesForSearchQuery('john').sort()).toEqual(['JHN'])
      expect(usfmBookPrefixesForSearchQuery('rom').sort()).toEqual(['ROM'])
      expect(usfmBookPrefixesForSearchQuery('1 joh').sort()).toEqual(['1JN'])
      expect(usfmBookPrefixesForSearchQuery('1 john').sort()).toEqual(['1JN'])
    })

    it('matches USFM-style prefixes', () => {
      expect(usfmBookPrefixesForSearchQuery('jhn').sort()).toEqual(['JHN'])
      expect(usfmBookPrefixesForSearchQuery('1co').sort()).toEqual(['1CO'])
    })

    it('maps Deuteronomy abbreviations and spaced letter typing', () => {
      expect(usfmBookPrefixesForSearchQuery('deut').sort()).toEqual(['DEU'])
      expect(usfmBookPrefixesForSearchQuery('dut').sort()).toEqual(['DEU'])
      expect(usfmBookPrefixesForSearchQuery('d u t').sort()).toEqual(['DEU'])
      expect(usfmBookPrefixesForSearchQuery('Deuteronomy').sort()).toEqual(['DEU'])
    })

    it('returns multiple books when the prefix is ambiguous', () => {
      const j = usfmBookPrefixesForSearchQuery('j')
      expect(j).toContain('JHN')
      expect(j).toContain('JAS')
      expect(j.length).toBeGreaterThan(3)
    })

    it('returns empty for punctuation-only or single ambiguous digit', () => {
      expect(usfmBookPrefixesForSearchQuery('???')).toEqual([])
      expect(usfmBookPrefixesForSearchQuery('3')).toEqual([])
    })
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
