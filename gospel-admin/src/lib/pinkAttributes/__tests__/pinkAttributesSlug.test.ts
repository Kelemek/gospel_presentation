import {
  PINK_ATTRIBUTES_SLUG,
  isPinkAttributesProfileSlug,
  pinkAttributesProfileTitle,
} from '@/lib/pinkAttributes/pinkAttributesSlug'

describe('pinkAttributesSlug', () => {
  it('exports pkag slug and title', () => {
    expect(PINK_ATTRIBUTES_SLUG).toBe('pkag')
    expect(pinkAttributesProfileTitle()).toBe('The Attributes of God (A.W. Pink)')
  })

  it('isPinkAttributesProfileSlug matches pkag only', () => {
    expect(isPinkAttributesProfileSlug('pkag')).toBe(true)
    expect(isPinkAttributesProfileSlug('PKAG')).toBe(true)
    expect(isPinkAttributesProfileSlug('jryh')).toBe(false)
  })
})
