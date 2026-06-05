import {
  RYLE_HOLINESS_SLUG,
  isRyleHolinessProfileSlug,
  ryleHolinessProfileTitle,
} from '@/lib/ryleHoliness/ryleHolinessSlug'

describe('ryleHolinessSlug', () => {
  it('recognizes jryh slug', () => {
    expect(isRyleHolinessProfileSlug('jryh')).toBe(true)
    expect(isRyleHolinessProfileSlug('JRYH')).toBe(true)
    expect(isRyleHolinessProfileSlug('bxrp')).toBe(false)
  })

  it('exports stable slug and title', () => {
    expect(RYLE_HOLINESS_SLUG).toBe('jryh')
    expect(ryleHolinessProfileTitle()).toContain('Holiness')
    expect(ryleHolinessProfileTitle()).toContain('Ryle')
  })
})
