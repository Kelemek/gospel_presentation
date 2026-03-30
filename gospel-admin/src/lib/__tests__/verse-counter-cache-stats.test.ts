import {
  SCRIPTURE_CACHE_VERSE_LIMIT,
  scriptureCacheStatsFromRows,
} from '@/lib/verse-counter'

describe('scriptureCacheStatsFromRows', () => {
  it('returns zeros for empty rows', () => {
    const s = scriptureCacheStatsFromRows([])
    expect(s.referenceCount).toBe(0)
    expect(s.totalVerses).toBe(0)
    expect(s.verseLimit).toBe(SCRIPTURE_CACHE_VERSE_LIMIT)
    expect(s.withinLimit).toBe(true)
  })

  it('counts references and verses', () => {
    const s = scriptureCacheStatsFromRows([
      { reference: 'John 3:16' },
      { reference: 'John 3:17' },
    ])
    expect(s.referenceCount).toBe(2)
    expect(s.totalVerses).toBe(2)
    expect(s.withinLimit).toBe(true)
  })
})
