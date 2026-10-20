import {
  isScougalLifeOfGodProfileSlug,
  SCOUGAL_LIFE_OF_GOD_SLUG,
  scougalLifeOfGodProfileTitle,
} from '@/lib/scougalLifeOfGod/scougalLifeOfGodSlug'

describe('scougalLifeOfGodSlug', () => {
  it('recognizes hslg slug', () => {
    expect(isScougalLifeOfGodProfileSlug('hslg')).toBe(true)
    expect(isScougalLifeOfGodProfileSlug('HSLG')).toBe(true)
    expect(isScougalLifeOfGodProfileSlug('aogr')).toBe(false)
  })

  it('exports stable slug and title', () => {
    expect(SCOUGAL_LIFE_OF_GOD_SLUG).toBe('hslg')
    expect(scougalLifeOfGodProfileTitle()).toContain('Henry Scougal')
  })
})
