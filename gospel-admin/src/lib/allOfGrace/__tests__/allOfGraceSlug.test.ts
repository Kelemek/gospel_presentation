import {
  ALL_OF_GRACE_SLUG,
  allOfGraceProfileTitle,
  isAllOfGraceProfileSlug,
} from '@/lib/allOfGrace/allOfGraceSlug'

describe('allOfGraceSlug', () => {
  it('recognizes aogr slug', () => {
    expect(isAllOfGraceProfileSlug('aogr')).toBe(true)
    expect(isAllOfGraceProfileSlug('AOGR')).toBe(true)
    expect(isAllOfGraceProfileSlug('ppgr')).toBe(false)
  })

  it('exports stable slug and title', () => {
    expect(ALL_OF_GRACE_SLUG).toBe('aogr')
    expect(allOfGraceProfileTitle()).toContain('All of Grace')
    expect(allOfGraceProfileTitle()).toContain('Spurgeon')
  })
})
