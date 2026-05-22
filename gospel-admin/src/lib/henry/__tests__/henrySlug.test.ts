import {
  henryProfileTitleForUsfm,
  henrySlugForUsfm,
  isHenryCommentaryProfileSlug,
  sortHenryBooksByCanonOrder,
} from '@/lib/henry/henrySlug'

describe('henrySlug', () => {
  it('recognizes mh + USFM slugs', () => {
    expect(isHenryCommentaryProfileSlug('mhgen')).toBe(true)
    expect(isHenryCommentaryProfileSlug('mhrom')).toBe(true)
    expect(isHenryCommentaryProfileSlug('cvrom')).toBe(false)
  })

  it('builds slug and title for a book', () => {
    expect(henrySlugForUsfm('GEN')).toBe('mhgen')
    expect(henryProfileTitleForUsfm('ROM')).toMatch(/Matthew Henry on Romans/i)
  })

  it('sorts books in canon order', () => {
    const sorted = sortHenryBooksByCanonOrder([
      { slug: 'mhrom' },
      { slug: 'mhgen' },
      { slug: 'mhrev' },
    ])
    expect(sorted.map((r) => r.slug)).toEqual(['mhgen', 'mhrom', 'mhrev'])
  })
})
