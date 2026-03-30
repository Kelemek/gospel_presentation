import { bookNameToUsfm, referenceToApiBiblePassageId } from '@/lib/api-bible-passage-id'

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
})
