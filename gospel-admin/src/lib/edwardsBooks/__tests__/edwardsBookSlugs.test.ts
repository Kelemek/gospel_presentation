import {
  EDWARDS_FREEDOM_OF_WILL_SLUG,
  EDWARDS_RELIGIOUS_AFFECTIONS_SLUG,
  EDWARDS_TREATISE_ON_GRACE_SLUG,
  isEdwardsBookProfileSlug,
  isEdwardsFreedomOfWillProfileSlug,
} from '@/lib/edwardsBooks/edwardsBookSlugs'

describe('edwardsBookSlugs', () => {
  it('recognizes Edwards book slugs but not sermon je slugs', () => {
    expect(isEdwardsBookProfileSlug('jefow')).toBe(true)
    expect(isEdwardsBookProfileSlug('jerea')).toBe(true)
    expect(isEdwardsBookProfileSlug('jetog')).toBe(true)
    expect(isEdwardsBookProfileSlug('je01')).toBe(false)
    expect(isEdwardsFreedomOfWillProfileSlug('JEFOW')).toBe(true)
  })

  it('exports stable slugs', () => {
    expect(EDWARDS_FREEDOM_OF_WILL_SLUG).toBe('jefow')
    expect(EDWARDS_RELIGIOUS_AFFECTIONS_SLUG).toBe('jerea')
    expect(EDWARDS_TREATISE_ON_GRACE_SLUG).toBe('jetog')
  })
})
