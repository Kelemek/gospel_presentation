import {
  edwardsSermonTitleForModalDisplay,
  isEdwardsSermonProfileSlug,
  slugForEdwardsSermonNumber,
  sortEdwardsSermonsByDisplayTitleAZ,
} from '@/lib/edwards/edwardsSlug'

describe('edwardsSlug', () => {
  it('formats je slugs from sermon number', () => {
    expect(slugForEdwardsSermonNumber(1)).toBe('je01')
    expect(slugForEdwardsSermonNumber(19)).toBe('je19')
  })

  it('detects Edwards sermon profile slugs', () => {
    expect(isEdwardsSermonProfileSlug('je01')).toBe(true)
    expect(isEdwardsSermonProfileSlug('sg00001')).toBe(false)
  })

  it('sorts by title A–Z', () => {
    expect(
      sortEdwardsSermonsByDisplayTitleAZ([
        { slug: 'je02', title: 'B' },
        { slug: 'je01', title: 'A' },
      ]).map((r) => r.slug)
    ).toEqual(['je01', 'je02'])
  })

  it('uses plain display title', () => {
    expect(edwardsSermonTitleForModalDisplay(' Sinners ')).toBe('Sinners')
  })
})
