import {
  parseUsfmPassageKeyToSpan,
  spurgeonPassageIndexBroadOrFilter,
  spurgeonPassageKeySpansOverlap,
} from '@/lib/spurgeon/spurgeonPassageKeyMatch'

describe('parseUsfmPassageKeyToSpan', () => {
  it('parses single verse, same-chapter range, and chapter-only', () => {
    expect(parseUsfmPassageKeyToSpan('PHP.2.3')).toEqual({ book: 'PHP', chapter: 2, lo: 3, hi: 3 })
    expect(parseUsfmPassageKeyToSpan('PHP.2.1-PHP.2.5')).toEqual({ book: 'PHP', chapter: 2, lo: 1, hi: 5 })
    expect(parseUsfmPassageKeyToSpan('PHP.2')).toMatchObject({ book: 'PHP', chapter: 2, lo: 1 })
    expect(parseUsfmPassageKeyToSpan('PHP.2')?.hi).toBe(176)
  })

  it('returns null for cross-chapter keys', () => {
    expect(parseUsfmPassageKeyToSpan('MAT.1.18-MAT.2.12')).toBeNull()
  })
})

describe('spurgeonPassageKeySpansOverlap', () => {
  it('detects overlap for range vs single verse (modal range, index verse)', () => {
    expect(spurgeonPassageKeySpansOverlap('PHP.2.1-PHP.2.5', 'PHP.2.3')).toBe(true)
    expect(spurgeonPassageKeySpansOverlap('PHP.2.3', 'PHP.2.1-PHP.2.5')).toBe(true)
  })

  it('detects overlap for two ranges', () => {
    expect(spurgeonPassageKeySpansOverlap('PHP.2.1-PHP.2.5', 'PHP.2.4-PHP.2.8')).toBe(true)
    expect(spurgeonPassageKeySpansOverlap('PHP.2.1-PHP.2.3', 'PHP.2.5-PHP.2.7')).toBe(false)
  })

  it('matches exact and prior single-verse-in-range behavior', () => {
    expect(spurgeonPassageKeySpansOverlap('ACT.26.15', 'ACT.26.15')).toBe(true)
    expect(spurgeonPassageKeySpansOverlap('ACT.26.15', 'ACT.26.15-ACT.26.18')).toBe(true)
    expect(spurgeonPassageKeySpansOverlap('ACT.26.17', 'ACT.26.15-ACT.26.18')).toBe(true)
    expect(spurgeonPassageKeySpansOverlap('ACT.26.14', 'ACT.26.15-ACT.26.18')).toBe(false)
    expect(spurgeonPassageKeySpansOverlap('ACT.27.15', 'ACT.26.15-ACT.26.18')).toBe(false)
    expect(spurgeonPassageKeySpansOverlap('ROM.8.28', 'ACT.26.15-ACT.26.18')).toBe(false)
  })
})

describe('spurgeonPassageIndexBroadOrFilter', () => {
  it('builds eq+like or filter for chapter-scoped fetch', () => {
    expect(spurgeonPassageIndexBroadOrFilter('PHP.2.1-PHP.2.5')).toBe('passage_key.eq.PHP.2,passage_key.like.PHP.2.%')
    expect(spurgeonPassageIndexBroadOrFilter('ACT.26.17')).toBe('passage_key.eq.ACT.26,passage_key.like.ACT.26.%')
  })
})
