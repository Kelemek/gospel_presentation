import {
  isLutherBondageProfileSlug,
  LUTHER_BONDAGE_SLUG,
  lutherBondageProfileTitle,
} from '@/lib/lutherBondage/lutherBondageSlug'

describe('lutherBondageSlug', () => {
  it('recognizes ltbw slug', () => {
    expect(isLutherBondageProfileSlug('ltbw')).toBe(true)
    expect(isLutherBondageProfileSlug('lgal')).toBe(false)
  })

  it('exposes profile title', () => {
    expect(LUTHER_BONDAGE_SLUG).toBe('ltbw')
    expect(lutherBondageProfileTitle()).toContain('Bondage of the Will')
  })
})
