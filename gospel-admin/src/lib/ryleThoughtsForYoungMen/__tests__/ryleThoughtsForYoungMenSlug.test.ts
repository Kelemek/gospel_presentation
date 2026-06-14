import {
  RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG,
  isRyleThoughtsForYoungMenProfileSlug,
  ryleThoughtsForYoungMenProfileTitle,
} from '@/lib/ryleThoughtsForYoungMen/ryleThoughtsForYoungMenSlug'

describe('ryleThoughtsForYoungMenSlug', () => {
  it('recognizes jrym slug', () => {
    expect(isRyleThoughtsForYoungMenProfileSlug('jrym')).toBe(true)
    expect(isRyleThoughtsForYoungMenProfileSlug('JRYM')).toBe(true)
    expect(isRyleThoughtsForYoungMenProfileSlug('jryh')).toBe(false)
  })

  it('exports slug and title', () => {
    expect(RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG).toBe('jrym')
    expect(ryleThoughtsForYoungMenProfileTitle()).toContain('Thoughts for Young Men')
    expect(ryleThoughtsForYoungMenProfileTitle()).toContain('Ryle')
  })
})
