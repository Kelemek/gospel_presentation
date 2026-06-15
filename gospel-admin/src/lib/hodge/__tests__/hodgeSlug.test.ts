import {
  HODGE_ST_VOLUME_1_SLUG,
  HODGE_ST_VOLUME_2_SLUG,
  HODGE_ST_VOLUME_3_SLUG,
  hodgeVolumeFromSlug,
  hodgeVolumeProfileTitle,
  isHodgeVolumeProfileSlug,
} from '@/lib/hodge/hodgeSlug'

describe('hodgeSlug', () => {
  it('identifies volume slugs', () => {
    expect(isHodgeVolumeProfileSlug('chst1')).toBe(true)
    expect(isHodgeVolumeProfileSlug('chst2')).toBe(true)
    expect(isHodgeVolumeProfileSlug('chst3')).toBe(true)
    expect(isHodgeVolumeProfileSlug('lbst')).toBe(false)
  })

  it('maps slug to volume and titles', () => {
    expect(hodgeVolumeFromSlug(HODGE_ST_VOLUME_1_SLUG)).toBe(1)
    expect(hodgeVolumeFromSlug(HODGE_ST_VOLUME_2_SLUG)).toBe(2)
    expect(hodgeVolumeFromSlug(HODGE_ST_VOLUME_3_SLUG)).toBe(3)
    expect(hodgeVolumeProfileTitle(1)).toContain('Vol. I')
    expect(hodgeVolumeProfileTitle(3)).toContain('Vol. III')
  })
})
