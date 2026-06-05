import {
  REFORMED_PASTOR_SLUG,
  reformedPastorProfileTitle,
  isReformedPastorProfileSlug,
} from '@/lib/reformedPastor/reformedPastorSlug'

describe('reformedPastorSlug', () => {
  it('recognizes bxrp slug', () => {
    expect(isReformedPastorProfileSlug('bxrp')).toBe(true)
    expect(isReformedPastorProfileSlug('BXRP')).toBe(true)
    expect(isReformedPastorProfileSlug('aogr')).toBe(false)
  })

  it('exports stable slug and title', () => {
    expect(REFORMED_PASTOR_SLUG).toBe('bxrp')
    expect(reformedPastorProfileTitle()).toContain('Reformed Pastor')
    expect(reformedPastorProfileTitle()).toContain('Baxter')
  })
})
