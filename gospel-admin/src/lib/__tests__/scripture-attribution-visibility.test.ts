import { isAttributionVisibleForTranslation } from '../scripture-attribution-visibility'

describe('isAttributionVisibleForTranslation', () => {
  it('returns true for any code when enabled list is null', () => {
    expect(isAttributionVisibleForTranslation('niv', null)).toBe(true)
    expect(isAttributionVisibleForTranslation('esv', null)).toBe(true)
  })

  it('matches case-insensitively against enabled codes', () => {
    expect(isAttributionVisibleForTranslation('esv', ['ESV', 'KJV'])).toBe(true)
    expect(isAttributionVisibleForTranslation('niv', ['esv', 'kjv'])).toBe(false)
  })
})
