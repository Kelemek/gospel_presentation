import { isWatsonBookProfileSlug, WATSON_BOOK_SLUGS } from '@/lib/watson/watsonSlug'

describe('watsonSlug', () => {
  it('recognizes all six Watson book slugs', () => {
    for (const slug of WATSON_BOOK_SLUGS) {
      expect(isWatsonBookProfileSlug(slug)).toBe(true)
    }
    expect(isWatsonBookProfileSlug('aogr')).toBe(false)
  })

  it('has six distinct slugs', () => {
    expect(WATSON_BOOK_SLUGS).toHaveLength(6)
    expect(new Set(WATSON_BOOK_SLUGS).size).toBe(6)
  })
})
