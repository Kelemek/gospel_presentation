import {
  calvinSlugForUsfm,
  calvinUsfmFromSlug,
  isCalvinCommentaryProfileSlug,
  calvinProfileTitleForUsfm,
  sortCalvinBooksByCanonOrder,
} from '@/lib/calvin/calvinSlug'

describe('calvinSlug', () => {
  it('recognizes cv-prefixed slugs', () => {
    expect(isCalvinCommentaryProfileSlug('cvGEN')).toBe(true)
    expect(isCalvinCommentaryProfileSlug('cv1CO')).toBe(true)
    expect(isCalvinCommentaryProfileSlug('sg00001')).toBe(false)
  })

  it('round-trips USFM codes', () => {
    expect(calvinSlugForUsfm('GEN')).toBe('cvgen')
    expect(calvinUsfmFromSlug('cvgen')).toBe('GEN')
    expect(calvinUsfmFromSlug('cvGEN')).toBe('GEN')
  })

  it('normalizes OSIS slugs to canonical USFM', () => {
    expect(calvinSlugForUsfm('EXOD')).toBe('cvexo')
    expect(calvinUsfmFromSlug('cvexod')).toBe('EXO')
    expect(calvinUsfmFromSlug('cvjohn')).toBe('JHN')
  })

  it('sorts by Protestant canon order', () => {
    const sorted = sortCalvinBooksByCanonOrder([
      { slug: 'cvrom', title: 'Calvin on Romans' },
      { slug: 'cvgen', title: 'Calvin on Genesis' },
      { slug: 'cvexo', title: 'Calvin on Exodus' },
    ])
    expect(sorted.map((r) => r.slug)).toEqual(['cvgen', 'cvexo', 'cvrom'])
  })

  it('builds display titles', () => {
    expect(calvinProfileTitleForUsfm('GEN')).toBe('Calvin on Genesis')
  })
})
